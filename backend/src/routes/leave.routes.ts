import { Router } from 'express';
import { LeaveController } from '../controllers/leave.controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeAdminOrManager } from '../middleware/authorize';

const router = Router();
const controller = new LeaveController();

router.use(authenticate);

// Public within authenticated users
router.get('/types', (req, res, next) => controller.getLeaveTypes(req, res, next));
router.get('/my/balances', (req, res, next) => controller.getMyBalances(req, res, next));
router.get('/my', (req, res, next) => controller.getMyRequests(req, res, next));
router.post('/', (req, res, next) => controller.createRequest(req, res, next));
router.put('/:id/cancel', (req, res, next) => controller.cancel(req, res, next));

// Admin & Manager review routes
router.get('/', authorizeAdminOrManager, (req, res, next) => controller.findAll(req, res, next));
router.put('/:id/approve', authorizeAdminOrManager, (req, res, next) => controller.approve(req, res, next));
router.put('/:id/reject', authorizeAdminOrManager, (req, res, next) => controller.reject(req, res, next));

export default router;
