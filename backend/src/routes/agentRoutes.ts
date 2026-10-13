import { Router } from 'express';
import { runAgentOptimizer } from '../agent/agentWorkflow';
import { predictSchemaImpact } from '../controllers/impactController';

const router = Router();

router.post('/optimize', runAgentOptimizer);
router.post('/impact', predictSchemaImpact);

export default router;
