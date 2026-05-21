import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { AuditController } from "./audit.controller";
import { AuditRepository } from "./audit.repository";
import { listAuditLogsSchema } from "./audit.schema";
import { AuditService } from "./audit.service";

const auditRepository = new AuditRepository();
const auditService = new AuditService(auditRepository);
const auditController = new AuditController(auditService);

export const auditRouter = Router();

auditRouter.use(authMiddleware);
auditRouter.get("/", validateRequest(listAuditLogsSchema), asyncHandler(auditController.listAuditLogs));
