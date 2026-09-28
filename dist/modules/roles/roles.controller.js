"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesController = void 0;
const roles_service_1 = require("./roles.service");
exports.rolesController = {
    async list(_req, res, next) {
        try {
            const roles = await roles_service_1.rolesService.listRoles();
            res.json({
                success: true,
                data: roles,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async listPermissions(_req, res, next) {
        try {
            const permissions = await roles_service_1.rolesService.listPermissions();
            res.json({
                success: true,
                data: permissions,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const role = await roles_service_1.rolesService.getRoleById(req.params.id);
            res.json({
                success: true,
                data: role,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const role = await roles_service_1.rolesService.createRole(req.body);
            res.status(201).json({
                success: true,
                data: role,
                message: 'Role created successfully',
            });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const role = await roles_service_1.rolesService.updateRole(req.params.id, req.body);
            res.json({
                success: true,
                data: role,
                message: 'Role updated successfully',
            });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            const result = await roles_service_1.rolesService.deleteRole(req.params.id);
            res.json({
                success: true,
                message: result.message,
            });
        }
        catch (err) {
            next(err);
        }
    },
};
//# sourceMappingURL=roles.controller.js.map