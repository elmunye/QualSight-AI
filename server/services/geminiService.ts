import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
  console.error('\n❌ GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env or set the env var.');
  if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
  }
}

const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');

// Gemini 2.5 only (1.5 is deprecated and returns 404 on v1beta). Do not use gemini-1.5-*.
export const PRO_MODEL_ID = "gemini-2.5-pro";
export const FLASH_MODEL_ID = "gemini-2.5-flash";

export const proModel = genAI.getGenerativeModel({ model: PRO_MODEL_ID });
export const flashModel = genAI.getGenerativeModel({ model: FLASH_MODEL_ID });

export const jsonConfig = {
  responseMimeType: "application/json",
};

/**
 * Robust JSON generation with retry logic for SyntaxErrors.
 * Uses native responseMimeType: 'application/json' where possible.
 */
export const generateJSON = async (model: any, prompt: string, retries = 1): Promise<any> => {
  let attempts = 0;
  let lastError: any;

  while (attempts <= retries) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: jsonConfig
      });
      const text = result.response.text();
      // Even with mimeType, some models might wrap in ```json ... ``` or add whitespace
      const cleaned = cleanJSON(text);
      return JSON.parse(cleaned);
    } catch (err: any) {
      lastError = err;
      // Only retry on JSON parse errors (SyntaxError)
      const isSyntaxError = err instanceof SyntaxError || err.message?.includes('JSON');
      
      if (isSyntaxError && attempts < retries) {
        console.warn(`JSON Parse Error. Retrying... (${attempts + 1}/${retries})`);
        // Append error to prompt to guide model fix
        prompt += `\n\nERROR: The previous response was invalid JSON. Error: ${err.message}. \nFix the JSON syntax and return ONLY the valid JSON.`;
        attempts++;
      } else {
        throw err;
      }
    }
  }
  throw lastError;
};


// --- CRITICAL FIX 1: The JSON Scrubber ---
// This prevents crashes when Gemini wraps output in Markdown
export const cleanJSON = (rawText: string) => {
  return rawText.replace(/```json|```/g, "").trim();
};

export function toUserMessage(err: any) {
  const m = err?.message || String(err);
  if (m.includes('API_KEY_INVALID') || m.includes('API key not valid')) {
    return 'Invalid or missing API key. Set GOOGLE_GENERATIVE_AI_API_KEY in .env and ensure the key has Gemini 2.5 access at https://aistudio.google.com/apikey';
  }
  if (m.includes('404') || m.includes('not found')) {
    return 'Gemini 2.5 model not available for this key. In AI Studio, enable Gemini 2.5 for your API key.';
  }
  if (m.includes('429') || m.includes('quota') || m.includes('rate')) {
    return 'Rate limit or quota exceeded. Try again in a moment or check your quota in Google AI Studio.';
  }
  if (m.includes('blockReason') || m.includes('blocked')) {
    return 'Response was blocked by safety filters. Try different or shorter input.';
  }
  return m;
}
