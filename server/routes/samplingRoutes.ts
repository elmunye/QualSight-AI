import express from 'express';
import { validateRequestBody } from 'zod-express-middleware';
import { samplingSchema } from '../schemas/apiSchemas.js';
import { generateSampleCoding } from '../controllers/samplingController.js';

const router = express.Router();

router.post('/generate-sample-coding', validateRequestBody(samplingSchema), generateSampleCoding);

export default router;
