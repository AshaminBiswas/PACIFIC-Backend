import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export const usersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, role, status } = req.query;
      const result = await usersService.listUsers({
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
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.getUserById(req.params.id);
      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await usersService.createUser(req.body);
      res.status(201).json({
        success: true,
        data: user,
        message: 'Admin user created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterId = (req as any).user?.id;
      const user = await usersService.updateUser(req.params.id, req.body, requesterId);
      res.json({
        success: true,
        data: user,
        message: 'Admin user updated successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      const result = await usersService.resetPassword(req.params.id, password);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },

  async reset2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await usersService.reset2fa(req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterId = (req as any).user?.id;
      const result = await usersService.deleteUser(req.params.id, requesterId);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  },
};
