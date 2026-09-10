import { getUserRiskProfile } from "@/lib/memory/sibyl";
import { executeWithFallback } from "@/lib/ai/fallback-engine";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { createAgentTools } from "@/lib/ai/tools";
import type { InspectorEvent } from "@/types/inspector";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletAddress, message, history = [] } = body;

    if (!walletAddress || !message) {
      return new Response(
        JSON.stringify({ error: "walletAddress and message are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Retrieve persistent Sibyl Memory scoped by wallet address
    const { profile: currentRiskProfile, source: memorySource } =
      await getUserRiskProfile(walletAddress);

    // Initial inspector event: FETCH_MEMORY
    const initialFetchEvent: InspectorEvent = {
      id: `ev-${Date.now()}-fetch`,
      type: "FETCH_MEMORY",
      timestamp: new Date().toLocaleTimeString(),
      title: `Sibyl Memory Loaded (${memorySource})`,
      data: {
        wallet: walletAddress,
        storageAdapter: memorySource,
        riskTolerance: currentRiskProfile.riskTolerance,
        maxSlippagePercent: currentRiskProfile.maxSlippagePercent,
        allowedTokens: currentRiskProfile.allowedTokens,
        maxBudgetPerTxUsdc: currentRiskProfile.maxBudgetPerTxUsdc,
        allowUnverifiedTokens: currentRiskProfile.allowUnverifiedTokens,
      },
      status: "info",
    };

    // Prepare system prompt and tools
    const systemPrompt = buildSystemPrompt({
      walletAddress,
      riskProfile: currentRiskProfile,
    });
    const tools = createAgentTools(walletAddress);

    // 2. Set up SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Track whether the stream has been closed to guard against
        // ERR_INVALID_STATE ("Controller is already closed") errors.
        let isClosed = false;

        // Helper to send SSE data — silently no-ops if stream is already closed.
        // The try/catch around enqueue() guards against the TOCTOU race where
        // the controller closes *between* the isClosed flag check and the actual
        // enqueue() call, which would otherwise throw ERR_INVALID_STATE.
        const sendEvent = (eventData: any) => {
          if (isClosed) return;
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
            );
          } catch (e: any) {
            if (e?.code === "ERR_INVALID_STATE") {
              isClosed = true; // sync the flag so future calls fast-exit
            } else {
              throw e; // re-throw unexpected errors
            }
          }
        };

        // Idempotent close — safe to call multiple times
        const closeStream = () => {
          if (!isClosed) {
            isClosed = true;
            try {
              controller.close();
            } catch (e) {
              // ignore already-closed errors
            }
          }
        };

        // Immediately push initial FETCH_MEMORY event
        sendEvent({
          type: "event",
          event: initialFetchEvent,
          rawPrefix: `[EVENT:FETCH_MEMORY] ${JSON.stringify(initialFetchEvent.data)}`,
        });

        try {
          // 3. Execute with streaming-aware primary → Groq fallback.
          // executeWithFallback owns the streaming loop internally so the
          // retry boundary is atomic: if Gemini fails at ANY point (during
          // setup OR mid-stream), Groq is invoked without the route ever
          // seeing the error or emitting the "[Notice]" fallback text.
          const { activeProvider } = await executeWithFallback({
            systemPrompt,
            messages: [
              ...history.map((h: any) => ({
                role: h.role as "user" | "assistant",
                content: h.content,
              })),
              { role: "user", content: message },
            ],
            tools,

            // Called for every streamed chunk from whichever provider wins
            onChunk: async (chunk) => {
              if (chunk.type === "text-delta") {
                sendEvent({
                  type: "chunk",
                  text: (chunk as any).textDelta ?? (chunk as any).text ?? "",
                });
              } else if (chunk.type === "tool-result") {
                const toolResult = (chunk as any).output ?? (chunk as any).result;
                if (toolResult && Array.isArray(toolResult.inspectorEvents)) {
                  for (const ev of toolResult.inspectorEvents) {
                    sendEvent({
                      type: "event",
                      event: ev,
                      rawPrefix: `[EVENT:${ev.type}] ${JSON.stringify(ev.data)}`,
                    });
                  }
                }
              }
            },

            // Called when a 429 triggers a within-provider key rotation.
            // Emits an Inspector event and SSE status event so the Developer Drawer stays accurate.
            onKeyRotation: (provider, keyIndex) => {
              const rotationEvent: InspectorEvent = {
                id: `ev-${Date.now()}-rot`,
                type: "FALLBACK",
                timestamp: new Date().toLocaleTimeString(),
                title: `AI Key Rotation: ${provider.toUpperCase()} Key #${keyIndex + 1}`,
                data: {
                  provider,
                  keyIndex: keyIndex + 1,
                  action: "rotating_to_next_key_in_pool",
                  reason: "rate_limit_or_high_demand",
                },
                status: "info",
              };
              sendEvent({
                type: "event",
                event: rotationEvent,
                rawPrefix: `[EVENT:FALLBACK] ${JSON.stringify(rotationEvent.data)}`,
              });
              sendEvent({
                type: "provider_status",
                provider,
                status: "key_rotation",
                keyIndex,
                message: `Rate limit hit — rotating to ${provider} key #${keyIndex + 1}`,
              });
            },

            // Called just before Groq takes over — emit visible Inspector event
            onFallback: (err: any) => {
              const fallbackEvent: InspectorEvent = {
                id: `ev-${Date.now()}-fallback`,
                type: "FALLBACK",
                timestamp: new Date().toLocaleTimeString(),
                title: "AI Failover: Delegating to Groq Llama 3.3",
                data: {
                  primaryProvider: "gemini",
                  secondaryProvider: "groq",
                  reason: "primary_exhausted_or_high_demand",
                  statusCode: err?.statusCode ?? err?.status ?? 503,
                  primaryError: err?.message ?? String(err),
                  rawErrorDetails: err?.data ?? err?.cause ?? null,
                },
                status: "info",
              };
              sendEvent({
                type: "event",
                event: fallbackEvent,
                rawPrefix: `[EVENT:FALLBACK] ${JSON.stringify(fallbackEvent.data)}`,
              });
            },
          });

          // Inform frontend which provider served this response
          sendEvent({ type: "provider_info", provider: activeProvider });

          // Fetch the latest profile in case tools updated it
          const { profile: updatedProfile, source: updatedSource } = await getUserRiskProfile(walletAddress);
          sendEvent({ type: "done", updatedProfile, source: updatedSource });
        } catch (execError: any) {
          console.error("[Chat Route Error]:", execError);

          // Only emit error payloads if the stream is still open
          if (!isClosed) {
            const errorEvent: InspectorEvent = {
              id: `ev-${Date.now()}-err`,
              type: "DECISION",
              timestamp: new Date().toLocaleTimeString(),
              title: "AI Provider Exhaustion (Safety Protected)",
              data: {
                error: execError?.message || "All AI providers temporarily busy",
                statusCode: execError?.statusCode ?? execError?.status ?? 500,
                code: execError?.code ?? "AI_UNAVAILABLE",
                name: execError?.name ?? "ProviderError",
                rawDetails: execError?.data ?? execError?.cause ?? null,
                memorySafeguardActive: true,
              },
              status: "blocked",
            };

            sendEvent({
              type: "event",
              event: errorEvent,
              rawPrefix: `[EVENT:DECISION] ${JSON.stringify(errorEvent.data)}`,
            });

            // User-friendly message without raw technical exception codes
            sendEvent({
              type: "chunk",
              text: `\n\nI apologize, but our upstream AI service is temporarily experiencing high demand. Your Sibyl Memory rules and assets remain 100% protected on Base Sepolia. Please try your request again in a moment.`,
            });

            sendEvent({ type: "done" });
          }
        } finally {
          closeStream();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
