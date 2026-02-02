import { proModel, flashModel, cleanJSON } from './geminiService.js';
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
        const result = await proModel.generateContent(selectorPrompt(themes, units.slice(0, poolSize)));
        const rawOutput = JSON.parse(cleanJSON(result.response.text()));
        
        const finalSelectionIds = new Set<string>();
        themes.forEach(theme => {
          theme.subThemes.forEach(sub => {
            const matches = rawOutput.filter((r: any) => normalize(r.themeId || r.id) === normalize(theme.id) && normalize(r.subThemeId) === normalize(sub.id));
            if (matches.length > 0) {
              finalSelectionIds.add(normalize(matches[0].unitId || matches[0].id));
            }
          });
        });
        selectedUnits = units.filter(u => finalSelectionIds.has(normalize(u.id)));
    } else {
        selectedUnits = [...units].sort(() => 0.5 - Math.random()).slice(0, 8);
    }

    const finalResult = await flashModel.generateContent(sampleCoderPrompt(themes, selectedUnits));
    const aiTags = JSON.parse(cleanJSON(finalResult.response.text()));
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
