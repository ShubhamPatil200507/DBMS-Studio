import { Router } from 'express';
import { analyzeSchema } from '../controllers/schemaController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protect schema structural normalization & analysis
router.post('/analyze', requireAuth, analyzeSchema);

export default router;
