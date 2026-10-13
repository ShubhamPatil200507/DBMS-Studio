import { Router } from 'express';
import { analyzePerformance } from '../controllers/performanceController';

const router = Router();

router.post('/analyze', analyzePerformance);

export default router;
