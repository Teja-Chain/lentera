import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

// Initialize Primary Engine: Google Gemini
function getPrimaryModel(): LanguageModel | null {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) return null;
  const google = createGoogleGenerativeAI({ apiKey });
  const modelName = process.env.GOOGLE_MODEL || "gemini-2.0-flash";
  return google(modelName);
}

// Initialize Secondary Fallback Engine: Groq via @ai-sdk/openai
function getSecondaryModel(): LanguageModel | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const groqOpenAI = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey,
  });
  const modelName = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  return groqOpenAI(modelName);
}

function isRateLimitOrServiceError(error: any): boolean {
  if (!error) return false;
  const msg = String(error?.message || "").toLowerCase();
  const status = error?.status || error?.statusCode;

  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("overloaded") ||
    msg.includes("resource_exhausted")
  );
}

/**
 * Executes an AI operation with automatic silent fallback:
 * Primary (Gemini) -> Secondary (Groq Llama 3.3 70B)
 */
export async function executeWithFallback<T>(
  operation: (model: LanguageModel, provider: "gemini" | "groq") => Promise<T>
): Promise<{ result: T; activeProvider: "gemini" | "groq" }> {
  const primaryModel = getPrimaryModel();
  const secondaryModel = getSecondaryModel();

  if (primaryModel) {
    try {
      const result = await operation(primaryModel, "gemini");
      return { result, activeProvider: "gemini" };
    } catch (primaryErr: any) {
      console.warn(
        `[Fallback Engine] Primary (Gemini) encountered error: ${primaryErr?.message || primaryErr}. Checking fallback...`
      );

      if (secondaryModel && (isRateLimitOrServiceError(primaryErr) || !process.env.GOOGLE_GENERATIVE_AI_API_KEY)) {
        try {
          console.info("[Fallback Engine] Instantly delegating to Secondary (Groq Llama 3.3 70B)...");
          const fallbackResult = await operation(secondaryModel, "groq");
          return { result: fallbackResult, activeProvider: "groq" };
        } catch (secondaryErr) {
          console.error("[Fallback Engine] Secondary provider also failed:", secondaryErr);
          throw secondaryErr;
        }
      }
      throw primaryErr;
    }
  }

  // If only Secondary is configured
  if (secondaryModel) {
    const result = await operation(secondaryModel, "groq");
    return { result, activeProvider: "groq" };
  }

  throw new Error(
    "No AI providers configured. Please set GOOGLE_GENERATIVE_AI_API_KEY or GROQ_API_KEY."
  );
}
