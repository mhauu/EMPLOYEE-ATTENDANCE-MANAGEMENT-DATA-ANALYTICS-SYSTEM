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
  message = 'Success',
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
  message = 'Created successfully'
): Response => sendSuccess(res, data, message, 201);

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  error = 'SERVER_ERROR',
  details?: unknown[]
): Response => {
  const response: ApiResponse = { success: false, message, error };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
};

export const sendNotFound = (res: Response, message = 'Resource not found'): Response =>
  sendError(res, message, 404, 'NOT_FOUND');

export const sendUnauthorized = (res: Response, message = 'Unauthorized'): Response =>
  sendError(res, message, 401, 'UNAUTHORIZED');

export const sendForbidden = (res: Response, message = 'Forbidden'): Response =>
  sendError(res, message, 403, 'FORBIDDEN');

export const sendBadRequest = (
  res: Response,
  message: string,
  details?: unknown[]
): Response => sendError(res, message, 400, 'BAD_REQUEST', details);
