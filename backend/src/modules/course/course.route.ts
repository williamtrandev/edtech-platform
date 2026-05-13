import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseController } from "./course.controller";
import { CourseRepository } from "./course.repository";
import { CourseService } from "./course.service";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { courseIdParamSchema, createCourseSchema, listCoursesSchema, updateCourseSchema } from "./course.schema";

const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const courseService = new CourseService(courseRepository, enrollmentRepository);
const courseController = new CourseController(courseService);

export const courseRouter = Router();

courseRouter.get("/", optionalAuthMiddleware, validateRequest(listCoursesSchema), asyncHandler(courseController.listCourses));
courseRouter.get(
  "/:id/enrollments",
  authMiddleware,
  validateRequest(courseIdParamSchema),
  asyncHandler(courseController.listCourseEnrollments)
);
courseRouter.delete("/:id", authMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.archiveCourse));
courseRouter.get("/:id", optionalAuthMiddleware, validateRequest(courseIdParamSchema), asyncHandler(courseController.getCourseById));
courseRouter.post("/", authMiddleware, validateRequest(createCourseSchema), asyncHandler(courseController.createCourse));
courseRouter.put("/:id", authMiddleware, validateRequest(updateCourseSchema), asyncHandler(courseController.updateCourse));
