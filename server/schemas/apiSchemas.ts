import { z } from 'zod';

export const segmentationSchema = z.object({
  text: z.string().min(10, "Text is too short for segmentation"),
});

export const taxonomySchema = z.object({
  rawText: z.string().min(10, "Text is too short"),
  contextType: z.string().optional(),
  purpose: z.string().optional(),
  customAnalystPrompt: z.string().optional(),
});

export const samplingSchema = z.object({
  units: z.array(z.object({
    id: z.string(),
    text: z.string(),
    sourceId: z.string().optional()
  })),
  themes: z.array(z.any()), // Can be more specific if we define Theme schema fully
  mode: z.enum(['quick', 'comprehensive'])
});

export const bulkAnalysisSchema = z.object({
  units: z.array(z.any()),
  themes: z.array(z.any()),
  corrections: z.array(z.any()).optional(),
  goldStandardUnits: z.array(z.any()).optional()
});

export const narrativeSchema = z.object({
  units: z.array(z.any()),
  themes: z.array(z.any())
});
