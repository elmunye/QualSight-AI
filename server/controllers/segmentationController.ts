import { Request, Response } from 'express';
import { segmentText } from '../services/segmentationService.js';
import { toUserMessage } from '../services/geminiService.js';
import { STEP_1_SEGMENTATION, AGENT_1_SEGMENTER, ROUTE_1_SEGMENT_DATA } from '../../constants/workflowSteps.js';

import { logger } from '../utils/logger.js';

export const segmentData = async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        if (!text || typeof text !== 'string') {
          return res.status(400).json({ error: 'Missing or invalid text.' });
        }
        logger.info(`--- ${STEP_1_SEGMENTATION} | ${AGENT_1_SEGMENTER} (${text.length} chars) ---`);
  
        const units = await segmentText(text);
        
        logger.info(`✅ ${ROUTE_1_SEGMENT_DATA}: ${units.length} units`);
        res.json(units);
    } catch (error) {
        logger.error(`${STEP_1_SEGMENTATION} ERROR:`, error);
        res.status(500).json({ error: toUserMessage(error) });
    }
}
