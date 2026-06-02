import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { CertificateRepository } from "../certificate/certificate.repository";
import { CertificateService } from "../certificate/certificate.service";
import { CertificateEligibilityService } from "../progress/certificate-eligibility.service";
import { CourseProgressRepository } from "../progress/course-progress.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { ProgressRepository } from "../progress/progress.repository";
import { ExamAttemptController } from "./exam-attempt.controller";
import { ExamAttemptIntegrityRepository } from "./exam-attempt-integrity.repository";
import { ExamAttemptRepository } from "./exam-attempt.repository";
import { ExamAttemptService } from "./exam-attempt.service";
import {
  examAttemptParamSchema,
  gradeExamAttemptSchema,
  recordExamIntegrityEventsSchema,
  saveExamAttemptAnswersSchema,
  submitExamAttemptSchema
} from "./exam-attempt.schema";

const examAttemptRepository = new ExamAttemptRepository();
const examAttemptIntegrityRepository = new ExamAttemptIntegrityRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const progressRepository = new ProgressRepository();
const courseProgressRepository = new CourseProgressRepository();
const certificateRepository = new CertificateRepository();
const courseProgressService = new CourseProgressService(progressRepository, courseProgressRepository);
const certificateService = new CertificateService(certificateRepository, notificationService, courseRepository);
const certificateEligibilityService = new CertificateEligibilityService(
  courseProgressService,
  certificateService,
  courseRepository
);
const examAttemptService = new ExamAttemptService(
  examAttemptRepository,
  examAttemptIntegrityRepository,
  courseRepository,
  enrollmentRepository,
  auditRepository,
  notificationService,
  certificateEligibilityService
);
const examAttemptController = new ExamAttemptController(examAttemptService);

export const examAttemptRouter = Router();

examAttemptRouter.get("/:attemptId", authMiddleware, validateRequest(examAttemptParamSchema), asyncHandler(examAttemptController.getAttempt));
examAttemptRouter.get(
  "/:attemptId/integrity-events",
  authMiddleware,
  validateRequest(examAttemptParamSchema),
  asyncHandler(examAttemptController.listIntegrityEvents)
);
examAttemptRouter.post(
  "/:attemptId/integrity-events",
  authMiddleware,
  validateRequest(recordExamIntegrityEventsSchema),
  asyncHandler(examAttemptController.recordIntegrityEvents)
);
examAttemptRouter.patch("/:attemptId/answers", authMiddleware, validateRequest(saveExamAttemptAnswersSchema), asyncHandler(examAttemptController.saveAttemptAnswers));
examAttemptRouter.patch("/:attemptId/grading", authMiddleware, validateRequest(gradeExamAttemptSchema), asyncHandler(examAttemptController.gradeAttempt));
examAttemptRouter.post("/:attemptId/submissions", authMiddleware, validateRequest(submitExamAttemptSchema), asyncHandler(examAttemptController.submitAttempt));
