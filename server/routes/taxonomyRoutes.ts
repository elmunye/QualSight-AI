import express from 'express';
import { validateRequestBody } from 'zod-express-middleware';
import { taxonomySchema } from '../schemas/apiSchemas.js';
import { generateTaxonomy, getTaxonomyPrompt } from '../controllers/taxonomyController.js';

const router = express.Router();

router.get('/taxonomy-prompt', getTaxonomyPrompt);
router.post('/generate-taxonomy', validateRequestBody(taxonomySchema), generateTaxonomy);

export default router;
