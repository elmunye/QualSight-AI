import { Request, Response } from 'express';
import { generateSampleCodingChain } from '../services/samplingService.js';
import { toUserMessage } from '../services/geminiService.js';
import { ROUTE_3_GENERATE_SAMPLE_CODING, STEP_3A_SAMPLE_SELECTOR, STEP_3B_SAMPLE_CODER } from '../../constants/workflowSteps.js';

import { logger } from '../utils/logger.js';

export const generateSampleCoding = async (req: Request, res: Response) => {
    try {
        const { units, themes, mode } = req.body;
        
        if (mode === 'comprehensive') {
            logger.info(`--- ${STEP_3A_SAMPLE_SELECTOR} | The Representative Scout ---`);
        }
        logger.info(`--- ${STEP_3B_SAMPLE_CODER} | The Draftsman ---`);

        const finalizedSamples = await generateSampleCodingChain(units, themes, mode);
        res.json(finalizedSamples);
    } catch (error) {
        logger.error(`${ROUTE_3_GENERATE_SAMPLE_CODING} ERROR:`, error);
        res.status(500).json({ error: toUserMessage(error) });
    }
}
