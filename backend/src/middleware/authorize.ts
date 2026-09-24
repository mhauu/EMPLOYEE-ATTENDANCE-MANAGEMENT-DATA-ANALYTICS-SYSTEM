import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendForbidden } from '../utils/response';

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, 'Not authenticated');
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'Insufficient permissions');
      return;
    }
    next();
  };
}

export function authorizeAdminOrManager(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || !['ADMIN', 'MANAGER'].includes(req.user.role)) {
    sendForbidden(res, 'Access requires ADMIN or MANAGER role');
    return;
  }
  next();
}
