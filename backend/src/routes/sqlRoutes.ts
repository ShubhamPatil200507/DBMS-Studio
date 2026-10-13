import { Router } from 'express';
import { generateSql, explainSql, validateSql, executeSql } from '../controllers/sqlController';

const router = Router();

router.post('/generate', generateSql);
router.post('/explain', explainSql);
router.post('/validate', validateSql);
router.post('/execute', executeSql);

export default router;
