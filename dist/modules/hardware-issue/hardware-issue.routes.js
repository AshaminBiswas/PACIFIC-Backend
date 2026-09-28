"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardwareCatalogRouter = void 0;
const express_1 = require("express");
const hardware_issue_controller_1 = require("./hardware-issue.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
exports.hardwareCatalogRouter = (0, express_1.Router)();
exports.hardwareCatalogRouter.get('/', hardwareCatalogControllerWrapper(hardware_issue_controller_1.hardwareIssueController.listCatalog));
exports.hardwareCatalogRouter.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('inventory:edit'), hardware_issue_controller_1.hardwareIssueController.createCatalogItem);
exports.hardwareCatalogRouter.patch('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('inventory:edit'), hardware_issue_controller_1.hardwareIssueController.updateCatalogItem);
function hardwareCatalogControllerWrapper(fn) {
    return fn;
}
const router = (0, express_1.Router)();
// Hardware Catalog nested endpoints
router.get('/catalog', hardware_issue_controller_1.hardwareIssueController.listCatalog);
router.post('/catalog', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('inventory:edit'), hardware_issue_controller_1.hardwareIssueController.createCatalogItem);
router.patch('/catalog/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('inventory:edit'), hardware_issue_controller_1.hardwareIssueController.updateCatalogItem);
// Hardware Issue Lists
router.get('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:view'), hardware_issue_controller_1.hardwareIssueController.listIssues);
router.get('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:view'), hardware_issue_controller_1.hardwareIssueController.getIssueById);
router.get('/:id/pdf', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:view'), hardware_issue_controller_1.hardwareIssueController.getPdf);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:create'), hardware_issue_controller_1.hardwareIssueController.createIssue);
router.patch('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:create'), hardware_issue_controller_1.hardwareIssueController.updateIssue);
router.delete('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:create'), hardware_issue_controller_1.hardwareIssueController.deleteIssue);
router.post('/:id/sign', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('warehouse:sign'), hardware_issue_controller_1.hardwareIssueController.signStep);
exports.default = router;
//# sourceMappingURL=hardware-issue.routes.js.map