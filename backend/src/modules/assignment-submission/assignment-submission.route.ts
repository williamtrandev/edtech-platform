import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { AssignmentSubmissionController } from "./assignment-submission.controller";
import { AssignmentSubmissionRepository } from "./assignment-submission.repository";
import { gradeAssignmentSubmissionSchema } from "./assignment-submission.schema";
import { AssignmentSubmissionService } from "./assignment-submission.service";

const assignmentSubmissionRepository = new AssignmentSubmissionRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const assignmentSubmissionService = new AssignmentSubmissionService(assignmentSubmissionRepository, courseRepository, enrollmentRepository, auditRepository, notificationService);
const assignmentSubmissionController = new AssignmentSubmissionController(assignmentSubmissionService);

export const assignmentSubmissionRouter = Router();

assignmentSubmissionRouter.patch("/:submissionId/grading", authMiddleware, validateRequest(gradeAssignmentSubmissionSchema), asyncHandler(assignmentSubmissionController.gradeSubmission));
