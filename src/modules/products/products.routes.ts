import { Router } from 'express';
import { productsController } from './products.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Public routes
router.get('/', productsController.list);
router.get('/categories', productsController.listCategories);
router.get('/slug/:slug', productsController.getBySlug);
router.get('/:id', productsController.getById);

// Admin routes
router.post('/', requireAuth, productsController.create);
router.put('/:id', requireAuth, productsController.update);
router.patch('/:id', requireAuth, productsController.update);
router.delete('/:id', requireAuth, productsController.delete);
router.post('/categories', requireAuth, productsController.createCategory);

export default router;
