import { Router } from 'express';
import { hardwareIssueController } from './hardware-issue.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';

export const hardwareCatalogRouter = Router();
hardwareCatalogRouter.get('/', hardwareCatalogControllerWrapper(hardwareIssueController.listCatalog));
hardwareCatalogRouter.post('/', requireAuth, requirePermission('inventory:edit'), hardwareIssueController.createCatalogItem);
hardwareCatalogRouter.patch('/:id', requireAuth, requirePermission('inventory:edit'), hardwareIssueController.updateCatalogItem);

function hardwareCatalogControllerWrapper(fn: any) {
  return fn;
}

const router = Router();

// Hardware Catalog nested endpoints
router.get('/catalog', hardwareIssueController.listCatalog);
router.post('/catalog', requireAuth, requirePermission('inventory:edit'), hardwareIssueController.createCatalogItem);
router.patch('/catalog/:id', requireAuth, requirePermission('inventory:edit'), hardwareIssueController.updateCatalogItem);

// Hardware Issue Lists
router.get('/', requireAuth, requirePermission('warehouse:view'), hardwareIssueController.listIssues);
router.get('/:id', requireAuth, requirePermission('warehouse:view'), hardwareIssueController.getIssueById);
router.get('/:id/pdf', requireAuth, requirePermission('warehouse:view'), hardwareIssueController.getPdf);

router.post('/', requireAuth, requirePermission('warehouse:create'), hardwareIssueController.createIssue);
router.patch('/:id', requireAuth, requirePermission('warehouse:create'), hardwareIssueController.updateIssue);
router.delete('/:id', requireAuth, requirePermission('warehouse:create'), hardwareIssueController.deleteIssue);
router.post('/:id/sign', requireAuth, requirePermission('warehouse:sign'), hardwareIssueController.signStep);

export default router;
