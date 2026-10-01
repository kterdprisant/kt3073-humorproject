import "server-only";
import { GoogleGenAI } from "@google/genai";

// Model alias that auto-tracks Google's current recommended Flash model.
// Vision-capable, used for both the image-description and caption calls.
export const GEMINI_MODEL = "gemini-flash-latest";

export function createGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}
