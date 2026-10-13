import { Router } from 'express';
import { generateDesign } from '../controllers/designController';

const router = Router();

router.post('/', generateDesign);

export default router;
