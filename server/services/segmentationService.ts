import { proModel, cleanJSON } from './geminiService.js';
import { segmentationPrompt } from '../prompts/segmentationPrompts.js';
import { DataUnit, Theme, CodedUnit } from '../../types.js';

export const segmentText = async (text: string): Promise<DataUnit[]> => {
    const result = await proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: segmentationPrompt(text) }] }],
        generationConfig: { temperature: 0.1, topP: 0.9 }
      });
      const raw = JSON.parse(cleanJSON(result.response.text()));
      const segments = Array.isArray(raw) ? raw : [];
      // @ts-ignore
      const units: DataUnit[] = segments.map((s, i) => ({ id: `u${i}`, text: typeof s === 'string' ? s : String(s), sourceId: 'upload-1' }));
      return units;
}
