"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersController = void 0;
const users_service_1 = require("./users.service");
exports.usersController = {
    async list(req, res, next) {
        try {
            const { page, limit, search, role, status } = req.query;
            const result = await users_service_1.usersService.listUsers({
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                search: search ? String(search) : undefined,
                role: role ? String(role) : undefined,
                status: status ? String(status) : undefined,
            });
            res.json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async getById(req, res, next) {
        try {
            const user = await users_service_1.usersService.getUserById(req.params.id);
            res.json({
                success: true,
                data: user,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async create(req, res, next) {
        try {
            const user = await users_service_1.usersService.createUser(req.body);
            res.status(201).json({
                success: true,
                data: user,
                message: 'Admin user created successfully',
            });
        }
        catch (err) {
            next(err);
        }
    },
    async update(req, res, next) {
        try {
            const requesterId = req.user?.id;
            const user = await users_service_1.usersService.updateUser(req.params.id, req.body, requesterId);
            res.json({
                success: true,
                data: user,
                message: 'Admin user updated successfully',
            });
        }
        catch (err) {
            next(err);
        }
    },
    async resetPassword(req, res, next) {
        try {
            const { password } = req.body;
            const result = await users_service_1.usersService.resetPassword(req.params.id, password);
            res.json({
                success: true,
                message: result.message,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async delete(req, res, next) {
        try {
            const requesterId = req.user?.id;
            const result = await users_service_1.usersService.deleteUser(req.params.id, requesterId);
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
//# sourceMappingURL=users.controller.js.map