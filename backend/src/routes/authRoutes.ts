import { Router } from 'express';
import { register, login, getCurrentUser } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate-limited authentication entry points
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

// Authenticated current user context
router.get('/me', requireAuth, getCurrentUser);

export default router;
