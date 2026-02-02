import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import {
  STEP_1_SEGMENTATION,
  STEP_2A_TAXONOMY_ANALYST,
  STEP_2B_TAXONOMY_CRITIC,
  STEP_2C_TAXONOMY_FINALIZER,
  STEP_3A_SAMPLE_SELECTOR,
  STEP_3B_SAMPLE_CODER,
  STEP_4A_BULK_ANALYST,
  STEP_4B_BULK_CRITIC,
  STEP_4C_BULK_SYNTHESIS,
  STEP_5_NARRATIVE,
  AGENT_1_SEGMENTER,
  AGENT_2A_TAXONOMY_ANALYST,
  AGENT_2B_TAXONOMY_CRITIC,
  AGENT_2C_TAXONOMY_FINALIZER,
  AGENT_3A_SAMPLE_SELECTOR,
  AGENT_3B_SAMPLE_CODER,
  AGENT_4A_BULK_ANALYST,
  AGENT_4B_BULK_CRITIC,
  AGENT_5_NARRATIVE,
  ROUTE_1_SEGMENT_DATA,
  ROUTE_2_GENERATE_TAXONOMY,
  ROUTE_3_GENERATE_SAMPLE_CODING,
  ROUTE_4_BULK_ANALYSIS,
  ROUTE_5_GENERATE_NARRATIVE,
} from './constants/workflowSteps.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from project root (same folder as server.js) so it works regardless of cwd
dotenv.config({ path: path.join(__dirname, '.env') });
export const app = express();

import { logger } from './server/utils/logger.js';

// @ts-ignore
const cleanJSON = (rawText) => {
  return rawText.replace(/```json|```/g, "").trim();
};

// 1. Timeout & Middleware
app.use((req, res, next) => {
  req.setTimeout(600000);
  res.setTimeout(600000);
  res.on('timeout', () => {
    logger.error('❌ Request Timed Out (180s)');
    if (!res.headersSent) {
      res.status(408).send('Analysis took too long. Try a smaller dataset.');
    }
  });
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- API key: load from .env (create .env with GOOGLE_GENERATIVE_AI_API_KEY=your-key) ---
const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
  console.error('\n❌ GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env or set the env var.');
  console.error('   Get a key: https://aistudio.google.com/apikey\n');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 2.5 only (1.5 is deprecated and returns 404 on v1beta). Do not use gemini-1.5-*.
const PRO_MODEL_ID = "gemini-2.5-pro";
const FLASH_MODEL_ID = "gemini-2.5-flash";
const proModel = genAI.getGenerativeModel({ model: PRO_MODEL_ID });
const flashModel = genAI.getGenerativeModel({ model: FLASH_MODEL_ID });

// Turn Google API errors into a short message for the UI
// @ts-ignore
function toUserMessage(err) {
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

import segmentationRoutes from './server/routes/segmentationRoutes.js';
import taxonomyRoutes from './server/routes/taxonomyRoutes.js';
import samplingRoutes from './server/routes/samplingRoutes.js';
import analysisRoutes from './server/routes/analysisRoutes.js';

app.use('/api', segmentationRoutes);
app.use('/api', taxonomyRoutes);
app.use('/api', samplingRoutes);
app.use('/api', analysisRoutes);

// --- ROUTE 1: Step 1 – Segmentation (Agent: Pro Segmenter) ---
// MOVED TO segmentationRoutes.ts

// --- ROUTE 2: Steps 2a, 2b, 2c – Taxonomy (Analyst → Critic → Finalizer) ---
// MOVED TO taxonomyRoutes.ts

// --- ROUTE 3: Steps 3a, 3b – Sample coding (HITL calibration) ---
// MOVED TO samplingRoutes.ts

// --- ROUTE 4: Steps 4a, 4b, 4c – Bulk analysis (Analyst → Critic → Synthesis) ---
// MOVED TO analysisRoutes.ts

// --- ROUTE 5: Step 5 – Narrative (Lead Author / Pro) ---
// MOVED TO analysisRoutes.ts

// --- DEPLOYMENT CONFIGURATION ---
const port = process.env.PORT || 8080;
app.use(express.static(path.join(__dirname, 'dist'))); 

app.get('/*path', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: "API Route Not Found" });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  // @ts-ignore
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 QualiSight LIVE on port ${port}`);
    console.log(`   Models: ${PRO_MODEL_ID}, ${FLASH_MODEL_ID}`);
    console.log(`   Open in browser: http://localhost:${port}`);
    console.log(`   (For dev UI on port 3000, run "npm run dev" in another terminal.)`);
  });
}