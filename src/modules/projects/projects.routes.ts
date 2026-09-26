import { Router } from 'express';
import { projectsController } from './projects.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Public — for portfolio display on website
router.get('/', projectsController.list);
router.get('/:id', projectsController.getById);

// Admin
router.post('/', requireAuth, projectsController.create);
router.put('/:id', requireAuth, projectsController.update);
router.patch('/:id', requireAuth, projectsController.update);
router.delete('/:id', requireAuth, projectsController.delete);

export default router;
