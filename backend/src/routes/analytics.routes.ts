import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdminOrManager } from '../middleware/authorize';

const router = Router();
const controller = new AnalyticsController();

router.use(authenticate);

// Employee can view personal analytics
router.get('/employee/:id?', (req, res, next) => controller.getEmployeeAnalytics(req, res, next));

// Admin & Manager routes
router.get('/summary', authorizeAdminOrManager, (req, res, next) => controller.getDashboardSummary(req, res, next));
router.get('/trend', authorizeAdminOrManager, (req, res, next) => controller.getAttendanceTrend(req, res, next));
router.get('/departments', authorizeAdminOrManager, (req, res, next) => controller.getDepartmentAnalytics(req, res, next));
router.get('/insights', authorizeAdminOrManager, (req, res, next) => controller.getInsights(req, res, next));
router.get('/status-distribution', authorizeAdminOrManager, (req, res, next) => controller.getStatusDistribution(req, res, next));

export default router;
