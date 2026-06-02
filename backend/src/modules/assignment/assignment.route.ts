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
import { CertificateRepository } from "../certificate/certificate.repository";
import { CertificateService } from "../certificate/certificate.service";
import { CertificateEligibilityService } from "../progress/certificate-eligibility.service";
import { CourseProgressRepository } from "../progress/course-progress.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { ProgressRepository } from "../progress/progress.repository";
import { AssignmentSubmissionService } from "../assignment-submission/assignment-submission.service";
import { AssignmentController } from "./assignment.controller";
import { AssignmentRepository } from "./assignment.repository";
import { AssignmentRubricRepository } from "./assignment-rubric.repository";
import { assignmentIdParamSchema, replaceAssignmentRubricSchema, updateAssignmentSchema } from "./assignment.schema";
import { AssignmentService } from "./assignment.service";

const assignmentRepository = new AssignmentRepository();
const assignmentRubricRepository = new AssignmentRubricRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const assignmentService = new AssignmentService(
  assignmentRepository,
  assignmentRubricRepository,
  courseRepository,
  enrollmentRepository,
  auditRepository
);
const assignmentController = new AssignmentController(assignmentService);
const assignmentSubmissionRepository = new AssignmentSubmissionRepository();
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
const assignmentSubmissionService = new AssignmentSubmissionService(
  assignmentSubmissionRepository,
  courseRepository,
  enrollmentRepository,
  auditRepository,
  notificationService,
  certificateEligibilityService
);
const assignmentSubmissionController = new AssignmentSubmissionController(assignmentSubmissionService);

export const assignmentRouter = Router();

assignmentRouter.get("/:assignmentId/submissions", authMiddleware, validateRequest(listAssignmentSubmissionsSchema), asyncHandler(assignmentSubmissionController.listAssignmentSubmissions));
assignmentRouter.post("/:assignmentId/submissions", authMiddleware, validateRequest(submitAssignmentSchema), asyncHandler(assignmentSubmissionController.submitAssignment));
assignmentRouter.put(
  "/:assignmentId/rubric-criteria",
  authMiddleware,
  validateRequest(replaceAssignmentRubricSchema),
  asyncHandler(assignmentController.replaceAssignmentRubric)
);
assignmentRouter.patch("/:assignmentId", authMiddleware, validateRequest(updateAssignmentSchema), asyncHandler(assignmentController.updateAssignment));
assignmentRouter.delete("/:assignmentId", authMiddleware, validateRequest(assignmentIdParamSchema), asyncHandler(assignmentController.archiveAssignment));
