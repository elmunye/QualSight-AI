import { flashModel, proModel, cleanJSON, generateJSON } from './geminiService.js';
import { bulkAnalystPrompt, bulkCriticPrompt, bulkJudgePrompt, narrativePrompt, librarianPrompt } from '../prompts/analysisPrompts.js';
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
    
    const BATCH_SIZE = 10;
    let allRawTags: any[] = [];
    
    for (let i = 0; i < units.length; i += BATCH_SIZE) {
        const chunk = units.slice(i, i + BATCH_SIZE);
        logger.info(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(units.length / BATCH_SIZE)}`);
        try {
            const batchTags = await generateJSON(flashModel, bulkAnalystPrompt(themes, chunk, fewShotExamples));
            if (Array.isArray(batchTags)) {
                allRawTags = [...allRawTags, ...batchTags];
            }
        } catch (err) {
            logger.error(`Error processing batch starting at index ${i}`, err);
        }
    }

    const bulkFirstThemeId = themes.length > 0 ? themes[0].id : '';
    const bulkFirstSubThemeId = themes.length > 0 && (themes[0].subThemes || []).length > 0 ? themes[0].subThemes[0].id : '';
    const primaryTags = (Array.isArray(allRawTags) ? allRawTags : []).map((tag: any) => {
    
    let tid = '';
    let sid = '';
    
    // Map indices back to IDs
    if (typeof tag.themeIndex === 'number' && themes[tag.themeIndex]) {
        tid = themes[tag.themeIndex].id;
        if (typeof tag.subThemeIndex === 'number' && themes[tag.themeIndex].subThemes && themes[tag.themeIndex].subThemes[tag.subThemeIndex]) {
            sid = themes[tag.themeIndex].subThemes[tag.subThemeIndex].id;
        }
    } else {
        // Fallback
        tid = tag.themeId || tag.theme_id || '';
        sid = tag.subThemeId || tag.sub_theme_id || '';
    }

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
    const criticResult = await generateJSON(flashModel, bulkCriticPrompt(themes, auditPayload));
    const auditReport = criticResult;

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
    adjudicatedResults = await generateJSON(proModel, bulkJudgePrompt(themes, conflicts)) || [];
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
    const organizedDataPromises = (Array.isArray(themes) ? themes : []).map(async theme => {
      const relevantUnits = (Array.isArray(units) ? units : []).filter(u => String(u.themeId) === String(theme.id));
      
      // Step 5a: The Librarian (Select top quotes)
      const subThemesForLibrarian = (theme.subThemes || []).map(sub => {
          const subUnits = relevantUnits.filter(u => String(u.subThemeId) === String(sub.id));
          // Limit pool to 20 candidates per sub-theme
          return {
            id: sub.id,
            name: sub.name,
            description: sub.description,
            candidates: subUnits.slice(0, 20).map(u => `"${(u.text || '').slice(0, 200)}..." (Unit ${u.unitId})`)
          };
      });

      let selectedQuotesMap: Record<string, string[]> = {};
      try {
          if (subThemesForLibrarian.length > 0) {
            // Use Flash for selection
            const librarianResult = await generateJSON(flashModel, librarianPrompt(theme.name, subThemesForLibrarian));
            if (Array.isArray(librarianResult)) {
                librarianResult.forEach((item: any) => {
                    if (item.subThemeId && Array.isArray(item.selectedQuotes)) {
                        selectedQuotesMap[item.subThemeId] = item.selectedQuotes;
                    }
                });
            }
          }
      } catch (err) {
          logger.warn(`Librarian failed for theme ${theme.name}, falling back to simple slice`, err);
      }

      return {
        themeName: theme.name,
        themeId: theme.id,
        count: relevantUnits.length,
        subThemes: (theme.subThemes || []).map(sub => {
          const subUnits = relevantUnits.filter(u => String(u.subThemeId) === String(sub.id));
          
          // Use Librarian quotes if available, otherwise fallback to slice(0, 5)
          let quotes = selectedQuotesMap[sub.id];
          if (!quotes || quotes.length === 0) {
              quotes = subUnits.slice(0, 5).map(u =>
                `"${(u.text || '').replace(/"/g, "'")}" (Unit ${u.unitId != null ? u.unitId : u.id})`
              );
          }

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

    const organizedData = await Promise.all(organizedDataPromises);

    const result = await proModel.generateContent(narrativePrompt(organizedData));
    const narrativeText = result.response.text();
    return narrativeText;
}
