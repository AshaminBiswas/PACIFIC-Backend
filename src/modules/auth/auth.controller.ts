import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, req);
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async firstTimeChangePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const tempToken =
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null) || req.body?.tempToken;

      if (!tempToken) {
        res.status(401).json({ success: false, message: 'Temporary authorization token required' });
        return;
      }

      const { newPassword } = req.body;
      const result = await authService.firstTimeChangePassword(tempToken, newPassword);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async firstTimeVerify2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const tempToken =
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null) || req.body?.tempToken;

      if (!tempToken) {
        res.status(401).json({ success: false, message: 'Temporary authorization token required' });
        return;
      }

      const { code } = req.body;
      if (!code) {
        res.status(400).json({ success: false, message: 'Verification code is required' });
        return;
      }

      const result = await authService.firstTimeVerify2fa(tempToken, code, req);
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async verify2fa(req: Request, res: Response, next: NextFunction) {
    try {
      const tempToken =
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice(7)
          : null) || req.body?.tempToken;

      if (!tempToken) {
        res.status(401).json({ success: false, message: 'Verification token required' });
        return;
      }

      const { code } = req.body;
      if (!code) {
        res.status(400).json({ success: false, message: 'Verification code is required' });
        return;
      }

      const result = await authService.verify2fa(tempToken, code, req);
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async setup2fa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await authService.setup2fa(req.user!.id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async enable2fa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      if (!code) {
        res.status(400).json({ success: false, message: 'Verification code required' });
        return;
      }
      const result = await authService.enable2fa(req.user!.id, code);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async disable2fa(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ success: false, message: 'Password confirmation required' });
        return;
      }
      const result = await authService.disable2fa(req.user!.id, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async regenerateRecoveryCodes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      if (!password) {
        res.status(400).json({ success: false, message: 'Password confirmation required' });
        return;
      }
      const result = await authService.regenerateRecoveryCodes(req.user!.id, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async listSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentToken = (req as any).sessionId || (req.headers['x-session-token'] as string);
      const sessions = await authService.listSessions(req.user!.id, currentToken);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  },

  async revokeSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await authService.revokeSession(id, req.user!.id);
      res.json({ success: true, message: 'Session revoked successfully' });
    } catch (err) {
      next(err);
    }
  },

  async revokeOtherSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentToken = (req as any).sessionId || (req.headers['x-session-token'] as string) || '';
      await authService.revokeOtherSessions(req.user!.id, currentToken);
      res.json({ success: true, message: 'All other sessions have been signed out' });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        res.status(401).json({ success: false, message: 'Refresh token required' });
        return;
      }
      const result = await authService.refreshTokens(token);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentSessionToken = (req as any).sessionId || (req.headers['x-session-token'] as string);
      if (req.user?.id) await authService.logout(req.user.id, currentSessionToken);
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },

  async createSuperAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email and password are required' });
        return;
      }
      if (typeof password !== 'string' || password.length < 6) {
        res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        return;
      }
      const result = await authService.provisionSuperAdmin({ email, password, firstName, lastName });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
};
