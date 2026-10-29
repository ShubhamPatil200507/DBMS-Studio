import { Router } from 'express';
import { generateDesign } from '../controllers/designController';
import { requireAuth } from '../middleware/authMiddleware';
import { expensiveOperationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protect generative AI database design endpoint
router.post('/', requireAuth, expensiveOperationRateLimiter, generateDesign);

export default router;
