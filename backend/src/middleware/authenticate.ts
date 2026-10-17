import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { sendUnauthorized } from '../utils/response';
import prisma from '../lib/prisma';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendUnauthorized(res, 'Chưa cung cấp mã xác thực (Token). Vui lòng đăng nhập.');
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // Xác minh tài khoản còn tồn tại và đang hoạt động
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { employee: { select: { id: true, status: true } } },
    });

    if (!user || !user.isActive) {
      sendUnauthorized(res, 'Tài khoản người dùng đã bị khóa hoặc không tồn tại.');
      return;
    }

    if (user.employee && user.employee.status === 'TERMINATED') {
      sendUnauthorized(res, 'Tài khoản nhân viên này đã ngừng hoạt động.');
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };

    next();
  } catch {
    sendUnauthorized(res, 'Phiên đăng nhập đã hết hạn hoặc mã xác thực không hợp lệ.');
  }
}
