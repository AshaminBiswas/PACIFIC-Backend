"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEntityScope = exports.requirePermission = void 0;
const database_1 = require("../config/database");
const requirePermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                res.status(401).json({ success: false, message: 'Authentication required' });
                return;
            }
            // Super Admin and Admin bypass
            const roleUpper = req.user.role?.toUpperCase();
            if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN') {
                next();
                return;
            }
            // Check user permissions via role_permissions
            const assignment = await database_1.prisma.userRoleAssignment.findFirst({
                where: {
                    userId: req.user.id,
                    role: {
                        permissions: {
                            some: {
                                permission: {
                                    code: permissionCode,
                                },
                            },
                        },
                    },
                },
            });
            if (!assignment) {
                res.status(403).json({
                    success: false,
                    message: `Forbidden: Missing required permission '${permissionCode}'`,
                });
                return;
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.requirePermission = requirePermission;
const requireEntityScope = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const roleUpper = req.user.role?.toUpperCase();
        if (roleUpper === 'SUPER_ADMIN' || roleUpper === 'ADMIN') {
            next();
            return;
        }
        const companyId = (req.params.companyId || req.body.companyProfileId || req.query.companyProfileId);
        if (!companyId) {
            next();
            return;
        }
        const hasAccess = await database_1.prisma.userEntityAccess.findUnique({
            where: {
                userId_companyProfileId: {
                    userId: req.user.id,
                    companyProfileId: companyId,
                },
            },
        });
        if (!hasAccess) {
            res.status(403).json({
                success: false,
                message: 'Forbidden: You do not have access to this company entity',
            });
            return;
        }
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.requireEntityScope = requireEntityScope;
//# sourceMappingURL=rbac.middleware.js.map