import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { sendSuccess, sendBadRequest } from '../utils/response';

const notificationService = new NotificationService();

export class NotificationController {
  async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendBadRequest(res, 'User context missing');
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const notifications = await notificationService.getUserNotifications(req.user.id, limit);
      const unreadCount = await notificationService.getUnreadCount(req.user.id);
      return sendSuccess(res, { notifications, unreadCount }, 'Notifications');
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendBadRequest(res, 'User context missing');
      const result = await notificationService.markAsRead(req.params.id, req.user.id);
      return sendSuccess(res, result, 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return sendBadRequest(res, 'User context missing');
      await notificationService.markAllAsRead(req.user.id);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  }
}
