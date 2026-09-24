import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new AuditController();

router.use(authenticate, authorize('ADMIN'));

router.get('/', (req, res, next) => controller.findAll(req, res, next));

export default router;
