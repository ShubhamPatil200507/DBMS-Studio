import { Router } from 'express';
import { analyzeSchema } from '../controllers/schemaController';

const router = Router();

router.post('/analyze', analyzeSchema);

export default router;
