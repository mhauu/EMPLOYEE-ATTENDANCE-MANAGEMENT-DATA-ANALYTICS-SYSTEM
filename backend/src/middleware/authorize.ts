import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendForbidden } from '../utils/response';

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendForbidden(res, 'Chưa xác thực người dùng.');
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'Bạn không có quyền thực hiện thao tác này (Yêu cầu quyền: ' + roles.join(', ') + ').');
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
    sendForbidden(res, 'Quyền truy cập yêu cầu vai trò QUẢN TRỊ VIÊN hoặc TRƯỞNG PHÒNG.');
    return;
  }
  next();
}
