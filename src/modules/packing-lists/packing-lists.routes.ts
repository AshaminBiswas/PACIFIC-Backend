import { Router } from 'express';
import { packingListsController } from './packing-lists.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

// Packet Types lookup
router.get('/packet-types', packingListsController.listPacketTypes);
router.post('/packet-types', requireAuth, requirePermission('logistics:edit'), packingListsController.addPacketType);

// Public acknowledgment route inside module router
router.get('/token/:token', packingListsController.getByToken);
router.post('/token/:token/acknowledge', packingListsController.acknowledgeByToken);

// Standard Packing Lists
router.get('/', requireAuth, requirePermission('logistics:view'), packingListsController.list);
router.get('/:id', requireAuth, requirePermission('logistics:view'), packingListsController.getById);
router.get('/:id/pdf', requireAuth, requirePermission('logistics:view'), packingListsController.getPdf);

router.post('/', requireAuth, requirePermission('logistics:create'), packingListsController.create);
router.patch('/:id', requireAuth, requirePermission('logistics:edit'), packingListsController.update);
router.delete('/:id', requireAuth, requirePermission('logistics:edit'), packingListsController.delete);
router.post('/:id/acknowledge', requireAuth, requirePermission('logistics:edit'), packingListsController.acknowledge);

export default router;
