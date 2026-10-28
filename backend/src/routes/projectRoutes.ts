import { Router } from 'express';
import { getProjects, getProjectById, createProject, updateProject, deleteProject, saveSchema, saveQuery } from '../controllers/projectController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Enforce verified authentication across all project CRUD and mutation routes
router.use(requireAuth);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/schema', saveSchema);
router.post('/:id/queries', saveQuery);

export default router;
