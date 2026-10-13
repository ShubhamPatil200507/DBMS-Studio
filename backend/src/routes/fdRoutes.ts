import { Router } from 'express';
import { handleClosure, handleCandidateKeys, handleNormalization } from '../controllers/fdController';

const router = Router();

router.post('/closure', handleClosure);
router.post('/candidate-keys', handleCandidateKeys);
router.post('/analyze', handleNormalization);

export default router;
