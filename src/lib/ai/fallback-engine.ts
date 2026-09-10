import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { LanguageModel, TextStreamPart, ToolSet } from "ai";

// ─── Model Initializers ───────────────────────────────────────────────────────

function getPrimaryModel(): LanguageModel | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;

  const google = createGoogleGenerativeAI({ apiKey });
  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return google(modelName);
}

function getSecondaryModel(): LanguageModel | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const groqOpenAI = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
  // Use .chat() to explicitly target /chat/completions (not /responses).
  // Default model is qwen/qwen3.8-27b — override with GROQ_MODEL env var.
  const modelName = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
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
  /** Called just before the secondary model takes over. */
  onFallback?: (error: unknown) => void;
};

export type ExecuteFallbackResult = {
  activeProvider: "gemini" | "groq";
  usedFallback: boolean;
};

/**
 * Streaming-aware fallback orchestrator: Primary (Gemini) → Secondary (Groq).
 *
 * ### Design
 * This function OWNS the streaming loop. Both `streamText()` and the
 * `for-await` that consumes it live inside the same try/catch, so:
 *   - 401 / 404 errors that throw during stream setup are caught.
 *   - 429 / 503 errors that surface mid-stream are caught.
 *   - `{ type: "error" }` chunks that the SDK emits instead of throwing are
 *     detected and re-thrown so the catch block fires.
 *
 * When the primary fails for ANY reason, `onFallback()` is called so the
 * route can emit a FALLBACK inspector event, then the secondary runs
 * identically through the same `onChunk` callback.
 *
 * The route layer never touches the raw stream — it just receives chunks
 * through `onChunk` and the final provider label from the return value.
 */
export async function executeWithFallback(
  params: ExecuteFallbackParams
): Promise<ExecuteFallbackResult> {
  const { systemPrompt, messages, tools, onChunk, onFallback } = params;

  const primary = getPrimaryModel();
  const secondary = getSecondaryModel();

  if (!primary && !secondary) {
    throw new Error(
      "No AI providers configured. Please set GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY."
    );
  }

  const buildArgs = (model: LanguageModel) =>
    ({
      model,
      system: systemPrompt,
      messages,
      tools,
    }) satisfies Parameters<typeof streamText>[0];

  /** Runs the full streamText call + for-await loop for a given model. */
  async function runStream(model: LanguageModel): Promise<void> {
    const result = streamText(buildArgs(model));

    for await (const chunk of result.fullStream) {
      // Detect SDK-level error chunks and convert them to a thrown error
      // so the outer catch block handles fallback uniformly.
      if ((chunk as any).type === "error") {
        const e = (chunk as any).error;
        throw e instanceof Error ? e : new Error(String(e ?? "Stream error chunk"));
      }
      await onChunk(chunk as TextStreamPart<ToolSet>);
    }

    // Vercel AI SDK v4+ surfaces errors on result.error after stream ends.
    // Await it so a silent HTTP failure (no thrown exception, no error chunk)
    // still triggers the fallback.
    const finishError = await (result as any).error?.catch?.(() => null);
    if (finishError) {
      throw finishError instanceof Error
        ? finishError
        : new Error(String(finishError));
    }
  }

  // ── Attempt Primary ─────────────────────────────────────────────────────────
  if (primary) {
    try {
      await runStream(primary);
      return { activeProvider: "gemini", usedFallback: false };
    } catch (primaryErr: any) {
      console.warn(
        `[AI Fallback] Primary Gemini failed (Status: ${
          primaryErr?.statusCode ?? primaryErr?.status ?? "Unknown"
        }). Delegating to Groq Llama 3.3...`,
        primaryErr?.message
      );

      if (!secondary) throw primaryErr;

      // Notify route so it can emit a FALLBACK inspector event
      onFallback?.(primaryErr);
    }
  }

  // ── Secondary (Groq) ────────────────────────────────────────────────────────
  if (!secondary) {
    throw new Error(
      "No secondary AI provider configured (GROQ_API_KEY missing)."
    );
  }

  console.info(
    "[AI Fallback] Instantly delegating to Secondary (Groq Llama 3.3 70B)..."
  );

  await runStream(secondary);
  return { activeProvider: "groq", usedFallback: true };
}

