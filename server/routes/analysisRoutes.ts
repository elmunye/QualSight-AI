import express from 'express';
import { validateRequestBody } from 'zod-express-middleware';
import { bulkAnalysisSchema, narrativeSchema } from '../schemas/apiSchemas.js';
import { startBulkAnalysisJob, getBulkAnalysisStatus } from '../controllers/jobController.js';
import { generateNarrative } from '../controllers/analysisController.js';

const router = express.Router();

// Async Job Queue endpoints
router.post('/bulk-analysis', validateRequestBody(bulkAnalysisSchema), startBulkAnalysisJob);
router.get('/jobs/:id', getBulkAnalysisStatus);

// Synchronous endpoints (kept for narrative for now, could be async too)
router.post('/generate-narrative', validateRequestBody(narrativeSchema), generateNarrative);

export default router;
