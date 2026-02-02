import PQueue from 'p-queue';
import { v4 as uuidv4 } from 'uuid';
import { performBulkAnalysisChain } from '../services/analysisService.js';
import { Theme, DataUnit, SampleCorrection, CodedUnit } from '../../types.js';
import { logger } from '../utils/logger.js';

// In-memory job store (replace with Redis for production)
const jobs = new Map<string, {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: CodedUnit[];
  error?: string;
  createdAt: number;
}>();

const queue = new PQueue({ concurrency: 2 }); // Process 2 bulk batches at a time

export const createBulkAnalysisJob = async (
  units: DataUnit[],
  themes: Theme[],
  corrections: SampleCorrection[],
  goldStandardUnits: any[]
): Promise<string> => {
  const jobId = uuidv4();
  
  jobs.set(jobId, {
    id: jobId,
    status: 'pending',
    createdAt: Date.now()
  });

  queue.add(async () => {
    try {
      jobs.set(jobId, { ...jobs.get(jobId)!, status: 'processing' });
      logger.info(`Starting job ${jobId}`);
      
      const result = await performBulkAnalysisChain(units, themes, corrections, goldStandardUnits);
      
      jobs.set(jobId, { ...jobs.get(jobId)!, status: 'completed', result });
      logger.info(`Job ${jobId} completed`);
    } catch (error: any) {
      logger.error(`Job ${jobId} failed:`, error);
      jobs.set(jobId, { ...jobs.get(jobId)!, status: 'failed', error: error.message });
    }
  });

  return jobId;
};

export const getJobStatus = (jobId: string) => {
  return jobs.get(jobId);
};
