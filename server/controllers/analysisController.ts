import { Request, Response } from 'express';
import { performBulkAnalysisChain, generateNarrativeChain } from '../services/analysisService.js';
import { toUserMessage } from '../services/geminiService.js';
import { ROUTE_4_BULK_ANALYSIS, ROUTE_5_GENERATE_NARRATIVE } from '../../constants/workflowSteps.js';

import { logger } from '../utils/logger.js';

export const bulkAnalysis = async (req: Request, res: Response) => {
    try {
        const { units, themes, corrections, goldStandardUnits } = req.body;
        const finalDataset = await performBulkAnalysisChain(units, themes, corrections, goldStandardUnits);
        res.json(finalDataset);
    } catch (error) {
        logger.error(`${ROUTE_4_BULK_ANALYSIS} ERROR:`, error);
        res.status(500).json({ error: toUserMessage(error) });
    }
}

export const generateNarrative = async (req: Request, res: Response) => {
    try {
        const { units, themes } = req.body;
        const text = await generateNarrativeChain(units, themes);
        res.json({ text });
    } catch (error) {
        logger.error(`${ROUTE_5_GENERATE_NARRATIVE} ERROR:`, error);
        res.status(500).json({ error: toUserMessage(error) });
    }
}
