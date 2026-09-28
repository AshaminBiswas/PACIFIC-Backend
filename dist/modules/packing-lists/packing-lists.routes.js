"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const packing_lists_controller_1 = require("./packing-lists.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// Packet Types lookup
router.get('/packet-types', packing_lists_controller_1.packingListsController.listPacketTypes);
router.post('/packet-types', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:edit'), packing_lists_controller_1.packingListsController.addPacketType);
// Public acknowledgment route inside module router
router.get('/token/:token', packing_lists_controller_1.packingListsController.getByToken);
router.post('/token/:token/acknowledge', packing_lists_controller_1.packingListsController.acknowledgeByToken);
// Standard Packing Lists
router.get('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:view'), packing_lists_controller_1.packingListsController.list);
router.get('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:view'), packing_lists_controller_1.packingListsController.getById);
router.get('/:id/pdf', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:view'), packing_lists_controller_1.packingListsController.getPdf);
router.post('/', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:create'), packing_lists_controller_1.packingListsController.create);
router.patch('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:edit'), packing_lists_controller_1.packingListsController.update);
router.delete('/:id', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:edit'), packing_lists_controller_1.packingListsController.delete);
router.post('/:id/acknowledge', auth_middleware_1.requireAuth, (0, rbac_middleware_1.requirePermission)('logistics:edit'), packing_lists_controller_1.packingListsController.acknowledge);
exports.default = router;
//# sourceMappingURL=packing-lists.routes.js.map