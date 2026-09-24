import { Router } from 'express';
import { EmployeeController } from '../controllers/employee.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize, authorizeAdminOrManager } from '../middleware/authorize';

const router = Router();
const controller = new EmployeeController();

router.use(authenticate);

// Employee can get their own profile
router.get('/my/profile', (req, res, next) => controller.getMyProfile(req, res, next));
router.get('/my/attendance-summary', (req, res, next) => controller.getAttendanceSummary(req, res, next));

// Admin & Manager can list and view employees
router.get('/', authorizeAdminOrManager, (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', authorizeAdminOrManager, (req, res, next) => controller.findById(req, res, next));
router.get('/:id/attendance-summary', authorizeAdminOrManager, (req, res, next) => controller.getAttendanceSummary(req, res, next));

// Only Admin can create or update employees
router.post('/', authorize('ADMIN'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', authorize('ADMIN'), (req, res, next) => controller.update(req, res, next));

export default router;
