import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseController } from "./course.controller";
import { CourseRepository } from "./course.repository";
import { CourseService } from "./course.service";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { courseEnrollmentsSchema, courseFacetsSchema, courseIdParamSchema, createCourseSchema, listCoursesSchema, updateCourseSchema } from "./course.schema";
import { AuditRepository } from "../audit/audit.repository";
import { CourseReviewController } from "../course-review/course-review.controller";
import { CourseReviewRepository } from "../course-review/course-review.repository";
import { courseReviewMeSchema, listCourseReviewsSchema, upsertCourseReviewSchema } from "../course-review/course-review.schema";
import { CourseReviewService } from "../course-review/course-review.service";
import { ExamController } from "../exam/exam.controller";
import { ExamRepository } from "../exam/exam.repository";
import { createExamSchema, courseExamsParamSchema } from "../exam/exam.schema";
import { ExamService } from "../exam/exam.service";

const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const auditRepository = new AuditRepository();
const courseService = new CourseService(courseRepository, enrollmentRepository, auditRepository);
const courseController = new CourseController(courseService);
const courseReviewRepository = new CourseReviewRepository();
const courseReviewService = new CourseReviewService(courseReviewRepository, courseRepository, enrollmentRepository);
const courseReviewController = new CourseReviewController(courseReviewService);
const examRepository = new ExamRepository();
const examService = new ExamService(examRepository, courseRepository, auditRepository);
const examController = new ExamController(examService);

export const courseRouter = Router();

courseRouter.get("/", optionalAuthMiddleware, validateRequest(listCoursesSchema), asyncHandler(courseController.listCourses));
courseRouter.get("/facets", optionalAuthMiddleware, validateRequest(courseFacetsSchema), asyncHandler(courseController.listCourseFacets));
courseRouter.get("/:id/exams", optionalAuthMiddleware, validateRequest(courseExamsParamSchema), asyncHandler(examController.listCourseExams));
courseRouter.post("/:id/exams", authMiddleware, validateRequest(createExamSchema), asyncHandler(examController.createCourseExam));
courseRouter.get("/:id/reviews", optionalAuthMiddleware, validateRequest(listCourseReviewsSchema), asyncHandler(courseReviewController.listCourseReviews));
courseRouter.put("/:id/reviews/me", authMiddleware, validateRequest(upsertCourseReviewSchema), asyncHandler(courseReviewController.upsertMyReview));
courseRouter.delete("/:id/reviews/me", authMiddleware, validateRequest(courseReviewMeSchema), asyncHandler(courseReviewController.deleteMyReview));
courseRouter.get(
  "/:id/enrollments",
  authMiddleware,
  validateRequest(courseEnrollmentsSchema),
  asyncHandler(courseController.listCourseEnrollments)
);
courseRouter.delete("/:id", authMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.archiveCourse));
courseRouter.get("/:id", optionalAuthMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.getCourseById));
courseRouter.post("/", authMiddleware, validateRequest(createCourseSchema), asyncHandler(courseController.createCourse));
courseRouter.put("/:id", authMiddleware, validateRequest(updateCourseSchema), asyncHandler(courseController.updateCourse));
