import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middleware/validate-request";
import { CourseRepository } from "../course/course.repository";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { ProgressRepository } from "../progress/progress.repository";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentRepository } from "./enrollment.repository";
import { EnrollmentService } from "./enrollment.service";
import { adminEnrollCourseSchema, adminRemoveCourseEnrollmentSchema, createEnrollmentSchema, dropEnrollmentSchema } from "./enrollment.schema";
import { UserRepository } from "../user/user.repository";

const enrollmentRepository = new EnrollmentRepository();
const courseRepository = new CourseRepository();
const progressRepository = new ProgressRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const userRepository = new UserRepository();
const enrollmentService = new EnrollmentService(
  enrollmentRepository,
  courseRepository,
  progressRepository,
  userRepository,
  notificationService
);
const enrollmentController = new EnrollmentController(enrollmentService);

export const enrollmentRouter = Router();

enrollmentRouter.use(authMiddleware);

enrollmentRouter.get("/me", asyncHandler(enrollmentController.listMyEnrollments));
enrollmentRouter.post("/", validateRequest(createEnrollmentSchema), asyncHandler(enrollmentController.createEnrollment));
enrollmentRouter.delete("/:enrollmentId", validateRequest(dropEnrollmentSchema), asyncHandler(enrollmentController.dropMyEnrollment));
