import { Router } from 'express';
import { runAgentOptimizer } from '../agent/agentWorkflow';
import { predictSchemaImpact } from '../controllers/impactController';
import { requireAuth } from '../middleware/authMiddleware';
import { expensiveOperationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protect autonomous agent optimization loop (Heavy compute & database interaction)
router.post('/optimize', requireAuth, expensiveOperationRateLimiter, runAgentOptimizer);

// Protect schema impact predictive modeling
router.post('/impact', requireAuth, expensiveOperationRateLimiter, predictSchemaImpact);

export default router;
