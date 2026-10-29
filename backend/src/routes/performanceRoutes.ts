import { Router } from 'express';
import { analyzePerformance } from '../controllers/performanceController';
import { requireAuth } from '../middleware/authMiddleware';
import { expensiveOperationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protect query performance & EXPLAIN diagnostic analysis
router.post('/analyze', requireAuth, expensiveOperationRateLimiter, analyzePerformance);

export default router;
