import { Request, Response, NextFunction } from 'express';
import { rolesService } from './roles.service';

export const rolesController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await rolesService.listRoles();
      res.json({
        success: true,
        data: roles,
      });
    } catch (err) {
      next(err);
    }
  },

  async listPermissions(_req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await rolesService.listPermissions();
      res.json({
        success: true,
        data: permissions,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await rolesService.getRoleById(req.params.id);
      res.json({
        success: true,
        data: role,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await rolesService.createRole(req.body);
      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const role = await rolesService.updateRole(req.params.id, req.body);
      res.json({
        success: true,
        data: role,
        message: 'Role updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await rolesService.deleteRole(req.params.id);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};
