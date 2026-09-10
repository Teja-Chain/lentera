import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { LanguageModel, TextStreamPart, ToolSet } from "ai";

// ─── Key Pool Helpers ─────────────────────────────────────────────────────────

/**
 * Parse a comma-separated env-var string into a trimmed, non-empty key list.
 * Falls back to a single-key env var when the multi-key var is absent.
 *
 * Priority:  GEMINI_API_KEYS  >  GOOGLE_GENERATIVE_AI_API_KEY
 *            GROQ_API_KEYS    >  GROQ_API_KEY
 */
function parseKeyPool(multiKey: string, singleKey: string): string[] {
  const raw = process.env[multiKey] ?? process.env[singleKey] ?? "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Round-robin index tracker — one counter per provider so rotations are
 * spread evenly across concurrent requests within the same Node.js process.
 */
const rrIndex: Record<string, number> = {};

// ─── Rate-Limit Detection ─────────────────────────────────────────────────────

function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const e = err as any;
  const status = e?.statusCode ?? e?.status ?? e?.httpStatus;
  if (status === 429) return true;
  const msg: string = (e?.message ?? e?.cause?.message ?? "").toLowerCase();
  return (
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit") ||
    msg.includes("quota") ||
    msg.includes("too many requests")
  );
}

// ─── Model Factories ──────────────────────────────────────────────────────────

function makeGeminiModel(apiKey: string): LanguageModel {
  const google = createGoogleGenerativeAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return google(modelName);
}

function makeGroqModel(apiKey: string): LanguageModel {
  const groqOpenAI = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
  // llama-3.3-70b-versatile has generous OTPM limits; avoid strict quota models.
  const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  return groqOpenAI.chat(modelName);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type StreamChunkCallback = (
  chunk: TextStreamPart<ToolSet>
) => void | Promise<void>;

export type ExecuteFallbackParams = {
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  tools: Parameters<typeof streamText>[0]["tools"];
  /** Invoked for every chunk from whichever provider is active. */
  onChunk: StreamChunkCallback;
  /** Called just before the secondary model takes over (full provider switch). */
  onFallback?: (error: unknown) => void;
  /**
   * Optional: called whenever a key-rotation retry happens *within* a single
   * provider (e.g. Gemini key #1 → key #2 on 429).  The route can use this
   * to emit a lightweight SSE status event without breaking the stream.
   */
  onKeyRotation?: (provider: "gemini" | "groq", keyIndex: number) => void;
};

export type ExecuteFallbackResult = {
  activeProvider: "gemini" | "groq";
  usedFallback: boolean;
};

// ─── Core Stream Runner ───────────────────────────────────────────────────────

/**
 * Runs a single streamText call end-to-end.
 * Throws on ANY error (setup, mid-stream, or silent finish error).
 */
async function runStream(
  model: LanguageModel,
  params: Pick<ExecuteFallbackParams, "systemPrompt" | "messages" | "tools" | "onChunk">,
  extra?: { maxTokens?: number }
): Promise<void> {
  const result = streamText({
    model,
    system: params.systemPrompt,
    messages: params.messages,
    tools: params.tools,
    ...(extra?.maxTokens != null ? { maxTokens: extra.maxTokens } : {}),
  });

  for await (const chunk of result.fullStream) {
    // Detect SDK-level error chunks and convert to a thrown error so the
    // outer catch block handles fallback/rotation uniformly.
    if ((chunk as any).type === "error") {
      const e = (chunk as any).error;
      throw e instanceof Error ? e : new Error(String(e ?? "Stream error chunk"));
    }
    await params.onChunk(chunk as TextStreamPart<ToolSet>);
  }

  // Vercel AI SDK v4+ surfaces errors on result.error after stream ends.
  const finishError = await (result as any).error?.catch?.(() => null);
  if (finishError) {
    throw finishError instanceof Error
      ? finishError
      : new Error(String(finishError));
  }
}

// ─── Key-Rotation Executor ────────────────────────────────────────────────────

/**
 * Attempts `runStream` with each key in `pool` in round-robin order.
 * On a 429 / RESOURCE_EXHAUSTED error it rotates to the next key immediately.
 * Any non-rate-limit error is re-thrown without trying other keys.
 *
 * @param pool          API key pool for this provider
 * @param namespace     Unique string used for RR index tracking ("gemini"|"groq")
 * @param modelFactory  Function that turns an API key into a LanguageModel
 * @param params        Forwarded stream params
 * @param extra         Per-provider stream options (e.g. maxTokens for Groq)
 * @param onKeyRotation Optional notification callback for the route layer
 */
async function executeWithKeyRotation(
  pool: string[],
  namespace: "gemini" | "groq",
  modelFactory: (key: string) => LanguageModel,
  params: Pick<ExecuteFallbackParams, "systemPrompt" | "messages" | "tools" | "onChunk">,
  extra?: { maxTokens?: number },
  onKeyRotation?: ExecuteFallbackParams["onKeyRotation"]
): Promise<void> {
  if (pool.length === 0) {
    throw new Error(`No API keys configured for provider: ${namespace}`);
  }

  // Start from the current RR position for this namespace
  const startIdx = (rrIndex[namespace] ?? 0) % pool.length;
  let lastError: unknown;

  for (let i = 0; i < pool.length; i++) {
    const keyIdx = (startIdx + i) % pool.length;
    const key = pool[keyIdx];

    // Advance the global RR counter so the next request starts after this key
    rrIndex[namespace] = keyIdx + 1;

    if (i > 0) {
      console.warn(
        `[AI KeyRotation] ${namespace} — rotating to key #${keyIdx} after ${i} 429 error(s).`
      );
      onKeyRotation?.(namespace, keyIdx);
    }

    try {
      const model = modelFactory(key);
      await runStream(model, params, extra);
      return; // success — exit rotation loop
    } catch (err: unknown) {
      lastError = err;
      if (!isRateLimitError(err)) {
        // Non-rate-limit error: bubble up immediately without trying more keys
        throw err;
      }
      console.warn(
        `[AI KeyRotation] ${namespace} key #${keyIdx} hit rate limit. Rotating to next key...`
      );
    }
  }

  // All keys in the pool are exhausted
  throw lastError ?? new Error(`All ${namespace} API keys are rate-limited.`);
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Streaming-aware fallback orchestrator: Primary (Gemini) → Secondary (Groq).
 *
 * ### Key-Rotation Layer
 * Before escalating to a different *provider*, the engine first exhausts the
 * entire key pool of the current provider on 429 / RESOURCE_EXHAUSTED errors.
 * Only if every key is rate-limited does it promote to a full provider fallback.
 *
 * ### Provider Key Resolution
 * - Gemini:  `GEMINI_API_KEYS` (comma-separated)  OR  `GOOGLE_GENERATIVE_AI_API_KEY`
 * - Groq:    `GROQ_API_KEYS`   (comma-separated)  OR  `GROQ_API_KEY`
 *
 * ### Groq Safety Cap
 * Groq calls are capped at `maxTokens: 500` to avoid OTPM ceiling errors on
 * models that enforce strict output-token-per-minute limits.
 */
export async function executeWithFallback(
  params: ExecuteFallbackParams
): Promise<ExecuteFallbackResult> {
  const { systemPrompt, messages, tools, onChunk, onFallback, onKeyRotation } = params;

  const geminiPool = parseKeyPool("GEMINI_API_KEYS", "GOOGLE_GENERATIVE_AI_API_KEY");
  const groqPool   = parseKeyPool("GROQ_API_KEYS",   "GROQ_API_KEY");

  const hasGemini = geminiPool.length > 0;
  const hasGroq   = groqPool.length   > 0;

  if (!hasGemini && !hasGroq) {
    throw new Error(
      "No AI providers configured. Please set GEMINI_API_KEYS (or GOOGLE_GENERATIVE_AI_API_KEY) or GROQ_API_KEYS (or GROQ_API_KEY)."
    );
  }

  const streamParams = { systemPrompt, messages, tools, onChunk };

  // ── Attempt Primary (Gemini with key rotation) ───────────────────────────────
  if (hasGemini) {
    try {
      await executeWithKeyRotation(
        geminiPool,
        "gemini",
        makeGeminiModel,
        streamParams,
        undefined,
        onKeyRotation
      );
      return { activeProvider: "gemini", usedFallback: false };
    } catch (primaryErr: unknown) {
      const e = primaryErr as any;
      console.warn(
        `[AI Fallback] All Gemini keys failed (Status: ${
          e?.statusCode ?? e?.status ?? "Unknown"
        }). Delegating to Groq Llama 3.3 70B...`,
        e?.message
      );

      if (!hasGroq) throw primaryErr;

      // Notify route so it can emit a FALLBACK inspector event
      onFallback?.(primaryErr);
    }
  }

  // ── Secondary: Groq with key rotation + output token cap ────────────────────
  if (!hasGroq) {
    throw new Error(
      "No secondary AI provider configured (GROQ_API_KEYS / GROQ_API_KEY missing)."
    );
  }

  console.info("[AI Fallback] Delegating to Secondary (Groq Llama 3.3 70B)...");

  await executeWithKeyRotation(
    groqPool,
    "groq",
    makeGroqModel,
    streamParams,
    { maxTokens: 500 },
    onKeyRotation
  );

  return { activeProvider: "groq", usedFallback: true };
}

