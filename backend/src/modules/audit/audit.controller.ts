import { Request, Response } from "express";
import { AuditService } from "./audit.service";

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const action = typeof req.query.action === "string" ? req.query.action : undefined;
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const logs = await this.auditService.listAuditLogs(req.user, page, limit, { search, action, entityType });
    res.status(200).json({ success: true, data: logs });
  };
}
