import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdminOrManager } from '../middleware/authorize';

const router = Router();
const controller = new ReportController();

router.use(authenticate, authorizeAdminOrManager);

router.get('/attendance', (req, res, next) => controller.getAttendanceReport(req, res, next));
router.get('/late', (req, res, next) => controller.getLateReport(req, res, next));
router.get('/overtime', (req, res, next) => controller.getOvertimeReport(req, res, next));
router.get('/leave', (req, res, next) => controller.getLeaveReport(req, res, next));

export default router;
