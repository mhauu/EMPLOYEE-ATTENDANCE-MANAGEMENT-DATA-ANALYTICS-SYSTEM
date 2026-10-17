import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.utils';
import { AppError } from '../middleware/errorHandler';
import {
  LoginInput,
  ChangePasswordInput,
} from '../validators/auth.validator';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  async login(input: LoginInput, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        employee: { select: { id: true, fullName: true, status: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new AppError('Email hoặc mật khẩu không chính xác.', 401, 'DANG_NHAP_THAT_BAI');
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError('Email hoặc mật khẩu không chính xác.', 401, 'DANG_NHAP_THAT_BAI');
    }

    if (user.employee && user.employee.status === 'TERMINATED') {
      throw new AppError(
        'Tài khoản này đã bị khóa do nhân viên đã nghỉ việc. Vui lòng liên hệ phòng Nhân sự.',
        403,
        'TAI_KHOAN_BI_KHOA'
      );
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Lưu trữ refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    // Cập nhật thời gian đăng nhập gần nhất
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Ghi nhật ký kiểm toán
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'TaiKhoan',
        entityId: user.id,
        ipAddress,
        description: `Người dùng ${user.email} đăng nhập hệ thống thành công`,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employee?.id,
        fullName: user.employee?.fullName,
      },
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'TaiKhoan',
        entityId: userId,
        description: 'Người dùng đã đăng xuất khỏi hệ thống',
      },
    });
  }

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 401, 'TOKEN_HET_HAN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: { employee: { select: { id: true } } },
    });
    if (!user || !user.isActive) {
      throw new AppError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.', 401, 'TAI_KHOAN_KHONG_HOP_LE');
    }

    const newPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee?.id,
    };
    const accessToken = generateAccessToken(newPayload);
    return { accessToken };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            status: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user) throw new AppError('Không tìm thấy thông tin tài khoản.', 404, 'KHONG_TIM_THAY');
    return user;
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('Không tìm thấy tài khoản người dùng.', 404, 'KHONG_TIM_THAY');

    const match = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!match) {
      throw new AppError('Mật khẩu hiện tại không chính xác.', 400, 'MAT_KHAU_CU_SAI');
    }

    const newHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Vô hiệu hóa tất cả các phiên đăng nhập cũ để đảm bảo an toàn
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }
}
