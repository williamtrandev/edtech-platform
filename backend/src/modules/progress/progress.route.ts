import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middleware/validate-request";
import { CertificateRepository } from "../certificate/certificate.repository";
import { CertificateService } from "../certificate/certificate.service";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { CertificateEligibilityService } from "./certificate-eligibility.service";
import { CourseProgressRepository } from "./course-progress.repository";
import { CourseProgressService } from "./course-progress.service";
import { ProgressController } from "./progress.controller";
import { ProgressRepository } from "./progress.repository";
import { ProgressService } from "./progress.service";
import {
  courseLessonProgressParamSchema,
  courseProgressParamSchema,
  createLessonProgressSchema,
  syncLessonProgressSchema
} from "./progress.schema";

const progressRepository = new ProgressRepository();
const courseProgressRepository = new CourseProgressRepository();
const enrollmentRepository = new EnrollmentRepository();
const courseRepository = new CourseRepository();
const certificateRepository = new CertificateRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const certificateService = new CertificateService(certificateRepository, notificationService, courseRepository);
const courseProgressService = new CourseProgressService(progressRepository, courseProgressRepository);
const certificateEligibilityService = new CertificateEligibilityService(
  courseProgressService,
  certificateService,
  courseRepository
);
const progressService = new ProgressService(
  progressRepository,
  enrollmentRepository,
  courseRepository,
  courseProgressService,
  certificateEligibilityService
);
const progressController = new ProgressController(progressService);

export const progressRouter = Router();

progressRouter.use(authMiddleware);

progressRouter.post("/", validateRequest(createLessonProgressSchema), asyncHandler(progressController.upsertLessonProgress));
progressRouter.post("/sync", validateRequest(syncLessonProgressSchema), asyncHandler(progressController.syncLessonProgress));
progressRouter.get(
  "/courses/:courseId/me",
  validateRequest(courseProgressParamSchema),
  asyncHandler(progressController.getMyCourseProgress)
);
progressRouter.get(
  "/courses/:courseId/me/lessons",
  validateRequest(courseLessonProgressParamSchema),
  asyncHandler(progressController.getMyLessonProgress)
);
