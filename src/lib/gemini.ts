import "server-only";
import { GoogleGenAI } from "@google/genai";

// Model alias that auto-tracks Google's current recommended Flash model.
// Only a fallback now: each prompt-chain step names its model via
// llm_models.provider_model_id (see src/lib/prompt-chain.ts).
export const GEMINI_MODEL = "gemini-flash-latest";

export function createGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}
