import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();
const controller = new NotificationController();

router.use(authenticate);

router.get('/', (req, res, next) => controller.getMyNotifications(req, res, next));
router.put('/:id/read', (req, res, next) => controller.markAsRead(req, res, next));
router.put('/read-all', (req, res, next) => controller.markAllAsRead(req, res, next));

export default router;
