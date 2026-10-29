import { Router } from 'express';
import { scanSourceCode, scanSnippet, auditDatabase } from '../controllers/securityController';
import { requireAuth, requireAdminAuth } from '../middleware/authMiddleware';
import { expensiveOperationRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Source code repository scanning (Authenticated developer capability)
router.get('/source-scan', requireAuth, expensiveOperationRateLimiter, scanSourceCode);

// Code snippet vulnerability scanning (Authenticated developer capability)
router.post('/scan-snippet', requireAuth, scanSnippet);

// Live database security and privilege auditing (Strictly administrative capability)
router.post('/database-audit', requireAdminAuth, expensiveOperationRateLimiter, auditDatabase);

export default router;
