import { Router } from 'express';
import { generateSql, explainSql, validateSql, executeSql } from '../controllers/sqlController';
import { requireAuth } from '../middleware/authMiddleware';
import { expensiveOperationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protect SQL generation (AI / LLM resource consumption)
router.post('/generate', requireAuth, expensiveOperationRateLimiter, generateSql);

// Protect SQL explanation
router.post('/explain', requireAuth, explainSql);

// Protect SQL AST validation
router.post('/validate', requireAuth, validateSql);

// Strictly protect SQL execution sandbox (Read-only, rate-limited, authenticated)
router.post('/execute', requireAuth, expensiveOperationRateLimiter, executeSql);

export default router;
