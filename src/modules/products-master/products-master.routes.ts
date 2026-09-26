import { Router } from 'express';
import { productsMasterController } from './products-master.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();

// Lookup routes (public/authenticated)
router.get('/materials', productsMasterController.getMaterials);
router.get('/finishes', productsMasterController.getFinishes);
router.get('/units', productsMasterController.getUnits);
router.get('/subcategories', productsMasterController.getSubcategories);

// Product routes
router.get('/', productsMasterController.list);
router.get('/:id', productsMasterController.getById);
router.post('/', requireAuth, productsMasterController.create);
router.patch('/:id', requireAuth, productsMasterController.update);
router.delete('/:id', requireAuth, productsMasterController.delete);

export default router;
