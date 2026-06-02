import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseController } from "./course.controller";
import { CourseRepository } from "./course.repository";
import { CourseService } from "./course.service";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { assignCourseInstructorSchema, courseEnrollmentsSchema, courseFacetsSchema, courseIdParamSchema, createCourseSchema, listCoursesSchema, lockCourseSchema, updateCourseSchema } from "./course.schema";
import { AuditRepository } from "../audit/audit.repository";
import { CourseReviewController } from "../course-review/course-review.controller";
import { CourseReviewRepository } from "../course-review/course-review.repository";
import { courseReviewMeSchema, listCourseReviewsSchema, upsertCourseReviewSchema } from "../course-review/course-review.schema";
import { CourseReviewService } from "../course-review/course-review.service";
import { CourseDiscussionController } from "../course-discussion/course-discussion.controller";
import { CourseDiscussionRepository } from "../course-discussion/course-discussion.repository";
import {
  createCourseDiscussionCommentSchema,
  deleteCourseDiscussionCommentSchema,
  listCourseDiscussionCommentsSchema
} from "../course-discussion/course-discussion.schema";
import { CourseDiscussionService } from "../course-discussion/course-discussion.service";
import { LessonRepository } from "../lesson/lesson.repository";
import { courseLiveSessionRouter } from "../live-session/live-session.route";
import { ExamController } from "../exam/exam.controller";
import { ExamRepository } from "../exam/exam.repository";
import { createExamSchema, courseExamsParamSchema } from "../exam/exam.schema";
import { ExamService } from "../exam/exam.service";
import { AssignmentController } from "../assignment/assignment.controller";
import { AssignmentRubricRepository } from "../assignment/assignment-rubric.repository";
import { AssignmentRepository } from "../assignment/assignment.repository";
import { createAssignmentSchema, courseAssignmentsParamSchema } from "../assignment/assignment.schema";
import { AssignmentService } from "../assignment/assignment.service";
import { EnrollmentController } from "../enrollment/enrollment.controller";
import { EnrollmentService } from "../enrollment/enrollment.service";
import { adminEnrollCourseSchema, adminRemoveCourseEnrollmentSchema } from "../enrollment/enrollment.schema";
import { NotificationRepository } from "../notification/notification.repository";
import { NotificationService } from "../notification/notification.service";
import { CourseProgressRepository } from "../progress/course-progress.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { ProgressRepository } from "../progress/progress.repository";
import { UserRepository } from "../user/user.repository";
import { CertificateController } from "../certificate/certificate.controller";
import { CertificateRepository } from "../certificate/certificate.repository";
import { listCourseCertificatesSchema } from "../certificate/certificate.schema";
import { CertificateService } from "../certificate/certificate.service";

const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const userRepository = new UserRepository();
const notificationRepository = new NotificationRepository();
const notificationService = new NotificationService(notificationRepository);
const courseService = new CourseService(courseRepository, enrollmentRepository, auditRepository, userRepository, notificationService);
const courseController = new CourseController(courseService);
const courseReviewRepository = new CourseReviewRepository();
const courseReviewService = new CourseReviewService(courseReviewRepository, courseRepository, enrollmentRepository);
const courseReviewController = new CourseReviewController(courseReviewService);
const lessonRepository = new LessonRepository();
const courseDiscussionRepository = new CourseDiscussionRepository();
const courseDiscussionService = new CourseDiscussionService(
  courseDiscussionRepository,
  courseRepository,
  enrollmentRepository,
  lessonRepository
);
const courseDiscussionController = new CourseDiscussionController(courseDiscussionService);
const examRepository = new ExamRepository();
const examService = new ExamService(examRepository, courseRepository, auditRepository);
const examController = new ExamController(examService);
const assignmentRepository = new AssignmentRepository();
const assignmentRubricRepository = new AssignmentRubricRepository();
const assignmentService = new AssignmentService(
  assignmentRepository,
  assignmentRubricRepository,
  courseRepository,
  enrollmentRepository,
  auditRepository
);
const assignmentController = new AssignmentController(assignmentService);
const progressRepository = new ProgressRepository();
const courseProgressRepository = new CourseProgressRepository();
const courseProgressService = new CourseProgressService(progressRepository, courseProgressRepository);
const certificateRepository = new CertificateRepository();
const certificateService = new CertificateService(certificateRepository, notificationService, courseRepository, auditRepository);
const certificateController = new CertificateController(certificateService);
const enrollmentService = new EnrollmentService(
  enrollmentRepository,
  courseRepository,
  courseProgressService,
  userRepository,
  notificationService
);
const enrollmentController = new EnrollmentController(enrollmentService);

export const courseRouter = Router();

courseRouter.get("/", optionalAuthMiddleware, validateRequest(listCoursesSchema), asyncHandler(courseController.listCourses));
courseRouter.get("/facets", optionalAuthMiddleware, validateRequest(courseFacetsSchema), asyncHandler(courseController.listCourseFacets));
courseRouter.get("/:id/exams", optionalAuthMiddleware, validateRequest(courseExamsParamSchema), asyncHandler(examController.listCourseExams));
courseRouter.post("/:id/exams", authMiddleware, validateRequest(createExamSchema), asyncHandler(examController.createCourseExam));
courseRouter.get("/:id/assignments", authMiddleware, validateRequest(courseAssignmentsParamSchema), asyncHandler(assignmentController.listCourseAssignments));
courseRouter.post("/:id/assignments", authMiddleware, validateRequest(createAssignmentSchema), asyncHandler(assignmentController.createCourseAssignment));
courseRouter.get("/:id/certificates", authMiddleware, validateRequest(listCourseCertificatesSchema), asyncHandler(certificateController.listCourseCertificates));
courseRouter.get("/:id/analytics", authMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.getCourseAnalytics));
courseRouter.get("/:id/archive-impact", authMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.getCourseArchiveImpact));
courseRouter.get("/:id/reviews", optionalAuthMiddleware, validateRequest(listCourseReviewsSchema), asyncHandler(courseReviewController.listCourseReviews));
courseRouter.put("/:id/reviews/me", authMiddleware, validateRequest(upsertCourseReviewSchema), asyncHandler(courseReviewController.upsertMyReview));
courseRouter.delete("/:id/reviews/me", authMiddleware, validateRequest(courseReviewMeSchema), asyncHandler(courseReviewController.deleteMyReview));
courseRouter.get(
  "/:id/discussion-comments",
  authMiddleware,
  validateRequest(listCourseDiscussionCommentsSchema),
  asyncHandler(courseDiscussionController.listComments)
);
courseRouter.post(
  "/:id/discussion-comments",
  authMiddleware,
  validateRequest(createCourseDiscussionCommentSchema),
  asyncHandler(courseDiscussionController.createComment)
);
courseRouter.delete(
  "/:id/discussion-comments/:commentId",
  authMiddleware,
  validateRequest(deleteCourseDiscussionCommentSchema),
  asyncHandler(courseDiscussionController.deleteComment)
);
courseRouter.use("/:id/live-sessions", courseLiveSessionRouter);
courseRouter.get(
  "/:id/enrollments",
  authMiddleware,
  validateRequest(courseEnrollmentsSchema),
  asyncHandler(courseController.listCourseEnrollments)
);
courseRouter.post("/:id/enrollments", authMiddleware, validateRequest(adminEnrollCourseSchema), asyncHandler(enrollmentController.enrollUserByManager));
courseRouter.delete(
  "/:id/enrollments/:userId",
  authMiddleware,
  validateRequest(adminRemoveCourseEnrollmentSchema),
  asyncHandler(enrollmentController.removeUserEnrollmentByManager)
);
courseRouter.delete("/:id", authMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.archiveCourse));
courseRouter.post("/:id/locks", authMiddleware, validateRequest(lockCourseSchema), asyncHandler(courseController.lockCourse));
courseRouter.delete("/:id/locks", authMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.unlockCourse));
courseRouter.put("/:id/instructors", authMiddleware, validateRequest(assignCourseInstructorSchema), asyncHandler(courseController.assignCourseInstructor));
courseRouter.get("/:id", optionalAuthMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.getCourseById));
courseRouter.post("/", authMiddleware, validateRequest(createCourseSchema), asyncHandler(courseController.createCourse));
courseRouter.put("/:id", authMiddleware, validateRequest(updateCourseSchema), asyncHandler(courseController.updateCourse));
