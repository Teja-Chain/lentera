import { streamText } from "ai";
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
        // Helper to send SSE data
        const sendEvent = (eventData: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`)
          );
        };

        // Immediately push initial FETCH_MEMORY event
        sendEvent({
          type: "event",
          event: initialFetchEvent,
          rawPrefix: `[EVENT:FETCH_MEMORY] ${JSON.stringify(initialFetchEvent.data)}`,
        });

        try {
          // 3. Execute with resilient fallback (Gemini -> Groq)
          const { result: textStreamResult, activeProvider } =
            await executeWithFallback(async (model) => {
              return streamText({
                model,
                system: systemPrompt,
                messages: [
                  ...history.map((h: any) => ({
                    role: h.role,
                    content: h.content,
                  })),
                  { role: "user", content: message },
                ],
                tools,
              });
            });

          // Inform frontend of active AI provider
          sendEvent({
            type: "provider_info",
            provider: activeProvider,
          });

          // Stream chunks and capture tool calls
          for await (const chunk of textStreamResult.fullStream) {
            if (chunk.type === "text-delta") {
              sendEvent({
                type: "chunk",
                text: (chunk as any).text ?? (chunk as any).textDelta ?? "",
              });
            } else if (chunk.type === "tool-result") {
              // Extract inspector events emitted by Virtuals/AI tools
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
          }

          // Fetch the latest profile in case tools updated it
          const { profile: updatedProfile } = await getUserRiskProfile(walletAddress);

          sendEvent({
            type: "done",
            updatedProfile,
          });
        } catch (execError: any) {
          console.error("[Chat Route Error]:", execError);

          // Emit a fallback decision or error event
          const errorEvent: InspectorEvent = {
            id: `ev-${Date.now()}-err`,
            type: "DECISION",
            timestamp: new Date().toLocaleTimeString(),
            title: "Execution Error Encountered",
            data: { error: execError?.message || "Internal error during execution" },
            status: "blocked",
          };

          sendEvent({
            type: "event",
            event: errorEvent,
            rawPrefix: `[EVENT:DECISION] ${JSON.stringify(errorEvent.data)}`,
          });

          sendEvent({
            type: "chunk",
            text: `\n\n[Notice]: The agent encountered an issue with AI providers: ${
              execError?.message || "Could not complete response"
            }. However, your Sibyl Memory rules remain strictly enforced.`,
          });

          sendEvent({ type: "done" });
        } finally {
          controller.close();
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
