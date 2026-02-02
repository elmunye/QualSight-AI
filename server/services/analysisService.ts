import { flashModel, proModel, cleanJSON } from './geminiService.js';
import { bulkAnalystPrompt, bulkCriticPrompt, bulkJudgePrompt, narrativePrompt } from '../prompts/analysisPrompts.js';
import { Theme, DataUnit, CodedUnit, SampleCorrection } from '../../types.js';
import { STEP_4A_BULK_ANALYST, STEP_4B_BULK_CRITIC, STEP_4C_BULK_SYNTHESIS, STEP_5_NARRATIVE, ROUTE_4_BULK_ANALYSIS, ROUTE_5_GENERATE_NARRATIVE, AGENT_4B_BULK_CRITIC } from '../../constants/workflowSteps.js';

import { logger } from '../utils/logger.js';

export const performBulkAnalysisChain = async (
    units: DataUnit[],
    themes: Theme[],
    corrections: SampleCorrection[],
    goldStandardUnits: any[]
): Promise<CodedUnit[]> => {
    logger.info(`--- ${ROUTE_4_BULK_ANALYSIS} (${units.length} units) ---`);

    // Few-shot examples from user-validated sample units (Step 3 corrections)
    const fewShotExamples = Array.isArray(goldStandardUnits) && goldStandardUnits.length > 0
    ? goldStandardUnits.map(g => 
        `Unit ${g.unitId || g.id}: "${(g.text || '').slice(0, 300)}${(g.text || '').length > 300 ? '...' : ''}" → Theme: ${g.themeId || ''}, Sub-theme: ${g.subThemeId || ''}`
        ).join('\n       ')
    : 'None - apply the Taxonomy operational definitions only.';

    // Step 4a – Bulk Analyst (The Bulk Analyst)
    logger.info(`--- ${STEP_4A_BULK_ANALYST} | The Bulk Analyst ---`);
    const analystResult = await flashModel.generateContent(bulkAnalystPrompt(themes, units, fewShotExamples));
    const rawPrimaryTags = JSON.parse(cleanJSON(analystResult.response.text()));
    const bulkFirstThemeId = themes.length > 0 ? themes[0].id : '';
    const bulkFirstSubThemeId = themes.length > 0 && (themes[0].subThemes || []).length > 0 ? themes[0].subThemes[0].id : '';
    const primaryTags = (Array.isArray(rawPrimaryTags) ? rawPrimaryTags : []).map((tag: any) => {
    const tid = tag.themeId || tag.theme_id || '';
    const sid = tag.subThemeId || tag.sub_theme_id || '';
    const tidNull = !tid || tid === 'null';
    const sidNull = !sid || sid === 'null';
    return {
        ...tag,
        themeId: tidNull ? bulkFirstThemeId : tid,
        subThemeId: sidNull ? bulkFirstSubThemeId : sid,
        strictFit: tag.strictFit !== false && !tidNull && !sidNull
    };
    });

    // Step 4b – Bulk Critic (Flash): audit analyst codes with text + codebook
    logger.info(`--- ${STEP_4B_BULK_CRITIC} | ${AGENT_4B_BULK_CRITIC} ---`);
    const auditPayload = primaryTags.map((tag: any) => {
    const original = units.find(u => String(u.id) === String(tag.unitId));
    return {
        unitId: tag.unitId,
        text: original ? original.text : "Error: Text missing",
        assignedTheme: tag.themeId,
        assignedSubTheme: tag.subThemeId,
        analystReasoning: tag.reasoning
    };
    });
    const criticResult = await flashModel.generateContent(bulkCriticPrompt(themes, auditPayload));
    const auditReport = JSON.parse(cleanJSON(criticResult.response.text()));

    // Step 4c – Bulk Synthesis & Adjudication (split consensus vs conflicts, adjudicate conflicts, merge)
    logger.info(`--- ${STEP_4C_BULK_SYNTHESIS} ---`);
    const conflicts: any[] = [];
    const consensus: any[] = [];
    const auditList = Array.isArray(auditReport) ? auditReport : [];

    auditList.forEach((audit: any) => {
    const originalTag = primaryTags.find((t: any) => String(t.unitId) === String(audit.unitId));
    if (!originalTag) return;
    const status = (audit.status || "").toUpperCase();
    if (status === "AGREE") {
        consensus.push({
        ...originalTag,
        confidence: 0.95,
        peerValidated: true
        });
    } else {
        conflicts.push({
        unitId: audit.unitId,
        text: units.find(u => String(u.id) === String(audit.unitId))?.text,
        optionA: { themeId: originalTag.themeId, subThemeId: originalTag.subThemeId, reasoning: originalTag.reasoning },
        optionB: { themeId: audit.correction?.themeId, subThemeId: audit.correction?.subThemeId, reasoning: audit.critique }
        });
    }
    });

    // Units in primaryTags but not in audit report → treat as consensus
    const seenUnitIds = new Set([...consensus.map(c => c.unitId), ...conflicts.map(c => c.unitId)]);
    primaryTags.forEach((tag: any) => {
    if (seenUnitIds.has(tag.unitId)) return;
    consensus.push({ ...tag, confidence: 0.85, peerValidated: false });
    });

    let adjudicatedResults: any[] = [];
    if (conflicts.length > 0) {
    logger.info(`--- Adjudicating ${conflicts.length} conflicts (Pro) ---`);
    const judgeResult = await proModel.generateContent(bulkJudgePrompt(themes, conflicts));
    adjudicatedResults = JSON.parse(cleanJSON(judgeResult.response.text())) || [];
    }

    // Merge consensus + adjudicated into final dataset; attach text and uniform shape for downstream
    const adjudicatedWithText = adjudicatedResults.map((r: any) => {
    const tid = (r.finalThemeId != null && r.finalThemeId !== 'null') ? r.finalThemeId : (r.themeId || bulkFirstThemeId);
    const sid = (r.finalSubThemeId != null && r.finalSubThemeId !== 'null') ? r.finalSubThemeId : (r.subThemeId || bulkFirstSubThemeId);
    return {
        unitId: r.unitId,
        themeId: tid,
        subThemeId: sid,
        reasoning: r.ruling,
        confidence: parseFloat(r.confidence) || 0.75,
        peerValidated: false,
        strictFit: false
    };
    });
    const finalDataset = [
    ...consensus.map(c => {
        const originalUnit = units.find(u => String(u.id) === String(c.unitId));
        return {
        ...c,
        text: originalUnit ? originalUnit.text : "Observation context lost"
        };
    }),
    ...adjudicatedWithText.map(r => {
        const originalUnit = units.find(u => String(u.id) === String(r.unitId));
        return {
        ...r,
        text: originalUnit ? originalUnit.text : "Observation context lost"
        };
    })
    ];

    return finalDataset;
}

export const generateNarrativeChain = async (units: CodedUnit[], themes: Theme[]): Promise<string> => {
    logger.info(`--- ${STEP_5_NARRATIVE} | Agent E: Lead Author ---`);

    // Group units by theme and sub-theme so the LLM sees structure and can cite quotes
    const organizedData = (Array.isArray(themes) ? themes : []).map(theme => {
      const relevantUnits = (Array.isArray(units) ? units : []).filter(u => String(u.themeId) === String(theme.id));
      return {
        themeName: theme.name,
        themeId: theme.id,
        count: relevantUnits.length,
        subThemes: (theme.subThemes || []).map(sub => {
          const subUnits = relevantUnits.filter(u => String(u.subThemeId) === String(sub.id));
          const maxQuotesPerSub = 25;
          const quotes = subUnits.slice(0, maxQuotesPerSub).map(u =>
            `"${(u.text || '').replace(/"/g, "'")}" (Unit ${u.unitId != null ? u.unitId : u.id})`
          );
          return {
            subThemeName: sub.name,
            subThemeId: sub.id,
            description: sub.description,
            count: subUnits.length,
            quotes
          };
        })
      };
    });

    const result = await proModel.generateContent(narrativePrompt(organizedData));
    const narrativeText = result.response.text();
    return narrativeText;
}
