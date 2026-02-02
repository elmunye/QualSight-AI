import { proModel, flashModel, cleanJSON, generateJSON } from './geminiService.js';
import { selectorPrompt, sampleCoderPrompt } from '../prompts/samplingPrompts.js';
import { Theme, DataUnit, CodedUnit } from '../../types.js';

export const generateSampleCodingChain = async (
    units: DataUnit[], 
    themes: Theme[], 
    mode: 'comprehensive' | 'quick'
): Promise<CodedUnit[]> => {
    let selectedUnits: DataUnit[] = [];
    const normalize = (id: string) => String(id || '').toLowerCase().replace(/[^0-9]/g, '');

    if (mode === 'comprehensive') {
        const poolSize = Math.min(units.length, 50);
        const pool = units.slice(0, poolSize);
        const rawOutput = await generateJSON(proModel, selectorPrompt(themes, pool));
        
        const finalSelectionIds = new Set<string>();
        
        if (Array.isArray(rawOutput)) {
            rawOutput.forEach((r: any) => {
                // Prefer index-based selection
                if (typeof r.unitIndex === 'number' && pool[r.unitIndex]) {
                    finalSelectionIds.add(pool[r.unitIndex].id);
                } else {
                    // Fallback to ID matching
                     const targetId = r.unitId || r.id;
                     if (targetId) {
                        const match = pool.find(u => normalize(u.id) === normalize(targetId));
                        if (match) finalSelectionIds.add(match.id);
                     }
                }
            });
        }
        selectedUnits = units.filter(u => finalSelectionIds.has(u.id));
    } else {
        selectedUnits = [...units].sort(() => 0.5 - Math.random()).slice(0, 8);
    }

    const aiTags = await generateJSON(flashModel, sampleCoderPrompt(themes, selectedUnits));
    const firstThemeId = themes.length > 0 ? themes[0].id : '';
    const firstSubThemeId = themes.length > 0 && (themes[0].subThemes || []).length > 0 ? themes[0].subThemes[0].id : '';

    const finalizedSamples = (Array.isArray(aiTags) ? aiTags : []).map((tag: any) => {
        const foundId = tag.unitId || tag.id || tag.uId || tag.unit_id;
        const match = selectedUnits.find(u => normalize(u.id) === normalize(foundId));
        const rawThemeId = tag.themeId || tag.theme_id || '';
        const rawSubThemeId = tag.subThemeId || tag.sub_theme_id || '';
        const isNullTheme = rawThemeId === '' || rawThemeId === 'null' || rawThemeId == null;
        const isNullSub = rawSubThemeId === '' || rawSubThemeId === 'null' || rawSubThemeId == null;
        const themeId = isNullTheme ? firstThemeId : rawThemeId;
        const subThemeId = isNullSub ? firstSubThemeId : rawSubThemeId;
        const strictFit = tag.strictFit !== false && !isNullTheme && !isNullSub;
        return {
          ...tag,
          unitId: match ? match.id : (foundId || "unknown"),
          themeId,
          subThemeId,
          strictFit: !!tag.strictFit && !isNullTheme && !isNullSub,
          confidence: strictFit ? (tag.confidence != null ? tag.confidence : 0.85) : 0.5,
          text: match ? match.text : "Text context lost"
        };
    });

    return finalizedSamples;
}
