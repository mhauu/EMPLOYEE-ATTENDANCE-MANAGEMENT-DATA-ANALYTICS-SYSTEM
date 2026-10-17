import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error(`[Lỗi] ${req.method} ${req.path}:`, err.message);

  // Lỗi xác thực dữ liệu đầu vào (Zod Validation)
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'LOI_DU_LIEU_DAU_VAO',
      message: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
      details: err.errors.map((e) => ({
        truong: e.path.join('.'),
        thongBao: e.message,
      })),
    });
    return;
  }

  // Lỗi ràng buộc cơ sở dữ liệu Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'TRUNG_LAP_DU_LIEU',
        message: 'Dữ liệu này đã tồn tại trong hệ thống (trùng lặp khóa duy nhất).',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'KHONG_TIM_THAY',
        message: 'Không tìm thấy bản ghi dữ liệu yêu cầu.',
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        error: 'VI_PHAM_KHOA_NGOAI',
        message: 'Không thể thực hiện do ràng buộc liên kết dữ liệu.',
      });
      return;
    }
  }

  // Lỗi ứng dụng có mã trạng thái cụ thể
  const appErr = err as Error & { statusCode?: number; code?: string };
  if (appErr.statusCode) {
    res.status(appErr.statusCode).json({
      success: false,
      error: appErr.code || 'LOI_NGHIEP_VU',
      message: err.message,
    });
    return;
  }

  // Lỗi máy chủ không xác định
  res.status(500).json({
    success: false,
    error: 'LOI_HE_THONG',
    message: err.message || 'Đã xảy ra lỗi không mong muốn trên máy chủ. Vui lòng thử lại sau.',
  });
}

// Lớp xử lý lỗi nghiệp vụ tùy chỉnh
export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}
