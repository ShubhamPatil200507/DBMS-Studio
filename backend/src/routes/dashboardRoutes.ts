import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protect workspace and system metrics reporting
router.get('/stats', requireAuth, getDashboardStats);

export default router;
