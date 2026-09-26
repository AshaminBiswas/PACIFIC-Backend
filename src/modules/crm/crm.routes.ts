import { Router } from 'express';
import { crmController } from './crm.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

const router = Router();

router.get('/', requireAuth, requirePermission('crm:view'), crmController.listCustomers);
router.post('/check-duplicates', requireAuth, requirePermission('crm:view'), crmController.checkDuplicates);
router.post('/merge', requireAuth, requirePermission('crm:edit'), crmController.mergeCustomers);

router.get('/:id', requireAuth, requirePermission('crm:view'), crmController.getCustomerById);
router.get('/:id/360', requireAuth, requirePermission('crm:view'), crmController.getCustomer360);
router.post('/', requireAuth, requirePermission('crm:create'), crmController.createCustomer);
router.patch('/:id', requireAuth, requirePermission('crm:edit'), crmController.updateCustomer);
router.delete('/:id', requireAuth, requirePermission('crm:delete'), crmController.deleteCustomer);
router.post('/:id/contacts', requireAuth, requirePermission('crm:edit'), crmController.addContact);
router.post('/:id/addresses', requireAuth, requirePermission('crm:edit'), crmController.addAddress);

export default router;
