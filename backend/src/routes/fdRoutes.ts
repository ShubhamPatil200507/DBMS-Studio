import { Router } from 'express';
import { handleClosure, handleCandidateKeys, handleNormalization } from '../controllers/fdController';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate-limited deterministic relational algorithm calculators
router.post('/closure', apiRateLimiter, handleClosure);
router.post('/candidate-keys', apiRateLimiter, handleCandidateKeys);
router.post('/analyze', apiRateLimiter, handleNormalization);

export default router;
