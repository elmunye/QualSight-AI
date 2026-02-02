import { proModel, cleanJSON, generateJSON } from './geminiService.js';
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
    // Truncate dataSlice to prevent context explosion
    const MAX_CHARS = 50000;
    const safeData = dataSlice.length > MAX_CHARS 
        ? dataSlice.slice(0, MAX_CHARS) + "\n...[TRUNCATED]..." 
        : dataSlice;

    // Step 2a – Taxonomy Analyst (Pro)
    const analystPrompt = customAnalystPrompt && typeof customAnalystPrompt === 'string'
        ? customAnalystPrompt.trim() + '\n\n' + getAnalystPromptFixedSuffix(safeData)
        : buildAnalystPromptTemplate(purpose).replace(/\{\{DATA\}\}/g, safeData);
    
    const initialTaxonomy = await generateJSON(proModel, analystPrompt);

    // Step 2b – Taxonomy Critic (Methodological Auditor)
    const critique = await generateJSON(proModel, criticPrompt(contextType, JSON.stringify(initialTaxonomy)));

    // Step 2c – Taxonomy Finalizer (Principal Investigator)
    const raw = await generateJSON(proModel, finalPrompt(contextType, JSON.stringify(initialTaxonomy), JSON.stringify(critique)));
    
    return normalizeThemes(raw);
}
