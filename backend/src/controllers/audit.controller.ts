import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';

const auditService = new AuditService();

export class AuditController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
      const { data, meta } = await auditService.findAll({
        page,
        limit,
        userId: req.query.userId as string,
        entity: req.query.entity as string,
        action: req.query.action as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });
      return sendSuccess(res, data, 'Audit logs', 200, meta);
    } catch (err) {
      next(err);
    }
  }
}
