import { Router } from 'express';
import { ShiftController } from '../controllers/shift.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';

const router = Router();
const controller = new ShiftController();

router.use(authenticate);

router.get('/my/current', (req, res, next) => controller.getMyShift(req, res, next));
router.get('/', (req, res, next) => controller.findAll(req, res, next));
router.get('/:id', (req, res, next) => controller.findById(req, res, next));
router.post('/', authorize('ADMIN'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', authorize('ADMIN'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', authorize('ADMIN'), (req, res, next) => controller.delete(req, res, next));
router.post('/assign', authorize('ADMIN'), (req, res, next) => controller.assignShift(req, res, next));

export default router;
