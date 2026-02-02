import { Request, Response } from 'express';
import { createBulkAnalysisJob, getJobStatus } from '../services/jobQueueService.js';
import { toUserMessage } from '../services/geminiService.js';
import { logger } from '../utils/logger.js';

export const startBulkAnalysisJob = async (req: Request, res: Response) => {
    try {
        const { units, themes, corrections, goldStandardUnits } = req.body;
        const jobId = await createBulkAnalysisJob(units, themes, corrections, goldStandardUnits);
        res.status(202).json({ jobId, message: 'Job accepted' });
    } catch (error) {
        logger.error('Failed to start bulk analysis job', error);
        res.status(500).json({ error: toUserMessage(error) });
    }
}

export const getBulkAnalysisStatus = (req: Request, res: Response) => {
    const { id } = req.params;
    const job = getJobStatus(id);
    
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
}
