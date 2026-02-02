import { Request, Response } from 'express';
import { generateTaxonomyChain } from '../services/taxonomyService.js';
import { getPromptTemplate } from '../services/promptService.js';
import { toUserMessage } from '../services/geminiService.js';
import { ROUTE_2_GENERATE_TAXONOMY, STEP_2A_TAXONOMY_ANALYST, STEP_2B_TAXONOMY_CRITIC, STEP_2C_TAXONOMY_FINALIZER, AGENT_2A_TAXONOMY_ANALYST } from '../../constants/workflowSteps.js';

import { logger } from '../utils/logger.js';

export const generateTaxonomy = async (req: Request, res: Response) => {
    try {
        const { rawText, contextType, purpose, customAnalystPrompt } = req.body;
        if (!rawText || typeof rawText !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid rawText. Paste your data first.' });
        }
        const ctx = contextType || 'Interview Transcripts';
        logger.info(`--- ${ROUTE_2_GENERATE_TAXONOMY} (${ctx}) ---`);

        const dataSlice = rawText.slice(0, 15000);
        logger.info(`--- ${STEP_2A_TAXONOMY_ANALYST} | ${AGENT_2A_TAXONOMY_ANALYST} ---`);
        
        // Logs for other steps handled inside service or just rely on result?
        // Original code logged before each step.
        // We can add logs here or in service. Service is cleaner if we want to reuse logic.
        // But for now, let's just log the start here.
        logger.info(`--- ${STEP_2B_TAXONOMY_CRITIC} | Agent B: Methodological Auditor ---`);
        logger.info(`--- ${STEP_2C_TAXONOMY_FINALIZER} | Agent C: Taxonomy Finalizer ---`);

        const themes = await generateTaxonomyChain(dataSlice, ctx, purpose, customAnalystPrompt);
        res.json(themes);
    } catch (error) {
        logger.error(`${ROUTE_2_GENERATE_TAXONOMY} ERROR:`, error);
        res.status(500).json({ error: toUserMessage(error) });
    }
}

export const getTaxonomyPrompt = (req: Request, res: Response) => {
    try {
        const purpose = req.query.purpose != null ? String(req.query.purpose) : 'support interpretation and reporting of key themes';
        const prompt = getPromptTemplate(purpose);
        res.json({ prompt });
    } catch (e) {
        res.status(500).json({ error: 'Failed to build prompt template.' });
    }
}
