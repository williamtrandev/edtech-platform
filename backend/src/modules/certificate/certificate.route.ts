import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { CertificateController } from "./certificate.controller";
import { CertificateRepository } from "./certificate.repository";
import { certificateIdParamSchema, certificateSearchEventSchema, certificateSearchSuggestionsSchema } from "./certificate.schema";
import { CertificateService } from "./certificate.service";

const certificateRepository = new CertificateRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const courseRepository = new CourseRepository();
const auditRepository = new AuditRepository();
const certificateService = new CertificateService(certificateRepository, notificationService, courseRepository, auditRepository);
const certificateController = new CertificateController(certificateService);

export const certificateRouter = Router();

certificateRouter.get("/me", authMiddleware, asyncHandler(certificateController.listMyCertificates));
certificateRouter.get("/search-suggestions", authMiddleware, validateRequest(certificateSearchSuggestionsSchema), asyncHandler(certificateController.getSearchSuggestions));
certificateRouter.post("/search-events", authMiddleware, validateRequest(certificateSearchEventSchema), asyncHandler(certificateController.trackSearchTerm));
certificateRouter.get("/:certificateId/pdf", authMiddleware, validateRequest(certificateIdParamSchema), asyncHandler(certificateController.downloadCertificatePdf));
certificateRouter.post("/:certificateId/revocations", authMiddleware, validateRequest(certificateIdParamSchema), asyncHandler(certificateController.revokeCertificate));
certificateRouter.delete("/:certificateId/revocations", authMiddleware, validateRequest(certificateIdParamSchema), asyncHandler(certificateController.restoreCertificate));
