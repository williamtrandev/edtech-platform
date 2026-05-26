import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { AuditRepository } from "../audit/audit.repository";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { AssignmentSubmissionController } from "../assignment-submission/assignment-submission.controller";
import { AssignmentSubmissionRepository } from "../assignment-submission/assignment-submission.repository";
import { listAssignmentSubmissionsSchema, submitAssignmentSchema } from "../assignment-submission/assignment-submission.schema";
import { AssignmentSubmissionService } from "../assignment-submission/assignment-submission.service";
import { AssignmentController } from "./assignment.controller";
import { AssignmentRepository } from "./assignment.repository";
import { assignmentIdParamSchema, updateAssignmentSchema } from "./assignment.schema";
import { AssignmentService } from "./assignment.service";

const assignmentRepository = new AssignmentRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const assignmentService = new AssignmentService(assignmentRepository, courseRepository, enrollmentRepository, auditRepository);
const assignmentController = new AssignmentController(assignmentService);
const assignmentSubmissionRepository = new AssignmentSubmissionRepository();
const assignmentSubmissionService = new AssignmentSubmissionService(assignmentSubmissionRepository, courseRepository, enrollmentRepository, auditRepository, notificationService);
const assignmentSubmissionController = new AssignmentSubmissionController(assignmentSubmissionService);

export const assignmentRouter = Router();

assignmentRouter.get("/:assignmentId/submissions", authMiddleware, validateRequest(listAssignmentSubmissionsSchema), asyncHandler(assignmentSubmissionController.listAssignmentSubmissions));
assignmentRouter.post("/:assignmentId/submissions", authMiddleware, validateRequest(submitAssignmentSchema), asyncHandler(assignmentSubmissionController.submitAssignment));
assignmentRouter.patch("/:assignmentId", authMiddleware, validateRequest(updateAssignmentSchema), asyncHandler(assignmentController.updateAssignment));
assignmentRouter.delete("/:assignmentId", authMiddleware, validateRequest(assignmentIdParamSchema), asyncHandler(assignmentController.archiveAssignment));
