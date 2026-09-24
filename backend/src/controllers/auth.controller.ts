import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { loginSchema, changePasswordSchema, refreshTokenSchema } from '../validators/auth.validator';
import { sendSuccess, sendBadRequest } from '../utils/response';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress;
      const result = await authService.login(parsed, ip);
      return sendSuccess(res, result, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.body.refreshToken;
      if (req.user) {
        await authService.logout(req.user.id, refreshToken);
      }
      return sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = refreshTokenSchema.parse(req.body);
      const result = await authService.refresh(parsed.refreshToken);
      return sendSuccess(res, result, 'Token refreshed');
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendBadRequest(res, 'User context missing');
      const user = await authService.getMe(req.user.id);
      return sendSuccess(res, user, 'Current user profile');
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendBadRequest(res, 'User context missing');
      const parsed = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user.id, parsed);
      return sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
      next(err);
    }
  }
}
