import express from 'express';
import { validateRequestBody } from 'zod-express-middleware';
import { segmentationSchema, taxonomySchema, samplingSchema, bulkAnalysisSchema, narrativeSchema } from '../schemas/apiSchemas.js';
import { segmentData } from '../controllers/segmentationController.js';

const router = express.Router();

router.post('/segment-data', validateRequestBody(segmentationSchema), segmentData);

export default router;
