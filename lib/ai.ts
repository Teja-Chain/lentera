import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

// Otak AI: OpenRouter first (free-tier models), falling back to direct
// Gemini or Groq keys if OpenRouter isn't configured or has no credit left.
export function resolveModel(): { model: LanguageModel; provider: string } {
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return {
      model: openrouter(process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free"),
      provider: "openrouter",
    };
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
    return {
      model: google(process.env.GOOGLE_MODEL ?? "gemini-2.0-flash"),
      provider: "gemini",
    };
  }
  if (process.env.GROQ_API_KEY) {
    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
    return {
      model: groq(process.env.GROQ_MODEL ?? "llama-3.1-8b-instant"),
      provider: "groq",
    };
  }
  throw new Error(
    "No AI provider configured. Set OPENROUTER_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or GROQ_API_KEY."
  );
}
