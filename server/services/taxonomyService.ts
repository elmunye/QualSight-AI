import { proModel, cleanJSON } from './geminiService.js';
import { buildAnalystPromptTemplate, criticPrompt, finalPrompt, getAnalystPromptFixedSuffix } from '../prompts/taxonomyPrompts.js';
import { Theme } from '../../types.js';

// Normalize taxonomy so frontend always gets Theme[] with id, name, subThemes[{ id, name, description }]
export function normalizeThemes(raw: any): Theme[] {
    const arr = Array.isArray(raw) ? raw : (raw?.themes || raw?.items || []);
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return arr.map((t: any, i: number) => {
      const themeId = t.id || `t${i + 1}`;
      const subs = t.subThemes || t.subthemes || t.sub_themes || [];
      return {
        id: themeId,
        name: t.name || `Theme ${i + 1}`,
        subThemes: subs.map((s: any, j: number) => ({
          id: s.id || `s${i + 1}-${j + 1}`,
          name: s.name || `Subtheme ${j + 1}`,
          description: s.description || s.name || ''
        }))
      };
    });
}

export const generateTaxonomyChain = async (
    dataSlice: string, 
    contextType: string, 
    purpose: string, 
    customAnalystPrompt?: string
) => {
    // Step 2a – Taxonomy Analyst (Pro)
    const analystPrompt = customAnalystPrompt && typeof customAnalystPrompt === 'string'
        ? customAnalystPrompt.trim() + '\n\n' + getAnalystPromptFixedSuffix(dataSlice)
        : buildAnalystPromptTemplate(purpose).replace(/\{\{DATA\}\}/g, dataSlice);
    
    // Correction: customAnalystPrompt handling in original code appended suffix.
    // In our extracted prompts, we have getAnalystPromptFixedSuffix.
    // We need to import it.
    
    // Let's refactor this slightly to be cleaner in a moment, but for now matching logic.
    
    const analystResult = await proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: analystPrompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    });
    const initialTaxonomy = cleanJSON(analystResult.response.text());

    // Step 2b – Taxonomy Critic (Methodological Auditor)
    const criticResult = await proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: criticPrompt(contextType, initialTaxonomy) }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    const critique = cleanJSON(criticResult.response.text());

    // Step 2c – Taxonomy Finalizer (Principal Investigator)
    const finalResult = await proModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: finalPrompt(contextType, initialTaxonomy, critique) }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    });
    
    const raw = JSON.parse(cleanJSON(finalResult.response.text()));
    return normalizeThemes(raw);
}
