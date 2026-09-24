import { Router } from 'express';
import authRoutes from './auth.routes';
import employeeRoutes from './employee.routes';
import departmentRoutes from './department.routes';
import positionRoutes from './position.routes';
import shiftRoutes from './shift.routes';
import locationRoutes from './location.routes';
import attendanceRoutes from './attendance.routes';
import leaveRoutes from './leave.routes';
import analyticsRoutes from './analytics.routes';
import reportRoutes from './report.routes';
import notificationRoutes from './notification.routes';
import auditRoutes from './audit.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/employees', employeeRoutes);
router.use('/departments', departmentRoutes);
router.use('/positions', positionRoutes);
router.use('/shifts', shiftRoutes);
router.use('/locations', locationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leaves', leaveRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
