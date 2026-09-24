import { Router } from 'express';
import { AttendanceController } from '../controllers/attendance.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdminOrManager } from '../middleware/authorize';

const router = Router();
const controller = new AttendanceController();

router.use(authenticate);

// Employee actions
router.post('/check-in', (req, res, next) => controller.checkIn(req, res, next));
router.post('/check-out', (req, res, next) => controller.checkOut(req, res, next));
router.get('/today', (req, res, next) => controller.getToday(req, res, next));
router.get('/my', (req, res, next) => controller.getMyAttendance(req, res, next));

// Admin & Manager view all records (manager scoped by department inside service)
router.get('/', authorizeAdminOrManager, (req, res, next) => controller.getAllAttendance(req, res, next));

export default router;
