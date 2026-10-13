import { Router } from 'express';
import { scanSourceCode, scanSnippet, auditDatabase } from '../controllers/securityController';

const router = Router();

router.get('/source-scan', scanSourceCode);
router.post('/scan-snippet', scanSnippet);
router.get('/database-audit', auditDatabase);
router.post('/database-audit', auditDatabase);

export default router;
