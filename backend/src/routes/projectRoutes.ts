import { Router } from 'express';
import { getProjects, getProjectById, createProject, updateProject, deleteProject, saveSchema, saveQuery } from '../controllers/projectController';

const router = Router();

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/', createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/schema', saveSchema);
router.post('/:id/queries', saveQuery);

export default router;
