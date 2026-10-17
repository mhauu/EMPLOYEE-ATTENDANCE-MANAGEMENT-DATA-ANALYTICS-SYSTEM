import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Thao tác thành công',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = { success: true, data, message };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Khởi tạo thành công'
): Response => sendSuccess(res, data, message, 201);

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  error = 'LOI_MAY_CHU',
  details?: unknown[]
): Response => {
  const response: ApiResponse = { success: false, message, error };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
};

export const sendNotFound = (res: Response, message = 'Không tìm thấy dữ liệu yêu cầu'): Response =>
  sendError(res, message, 404, 'KHONG_TIM_THAY');

export const sendUnauthorized = (res: Response, message = 'Yêu cầu xác thực tài khoản'): Response =>
  sendError(res, message, 401, 'CHUA_XAC_THUC');

export const sendForbidden = (res: Response, message = 'Không có quyền truy cập dữ liệu này'): Response =>
  sendError(res, message, 403, 'TU_CHOI_TRUY_CAP');

export const sendBadRequest = (
  res: Response,
  message: string,
  details?: unknown[]
): Response => sendError(res, message, 400, 'YEU_CAU_KHONG_HOP_LE', details);
