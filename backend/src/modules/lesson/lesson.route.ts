import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middleware/validate-request";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { LessonController } from "./lesson.controller";
import { LessonRepository } from "./lesson.repository";
import { LessonService } from "./lesson.service";
import {
  courseLessonsParamSchema,
  createLessonSchema,
  lessonIdParamSchema,
  updateCourseLessonOrderSchema,
  updateLessonOrderSchema,
  updateLessonSchema
} from "./lesson.schema";

const lessonRepository = new LessonRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const lessonService = new LessonService(lessonRepository, courseRepository, enrollmentRepository);
const lessonController = new LessonController(lessonService);

export const lessonRouter = Router();

lessonRouter.get(
  "/courses/:courseId/lessons",
  optionalAuthMiddleware,
  validateRequest(courseLessonsParamSchema),
  asyncHandler(lessonController.listLessonsByCourse)
);
lessonRouter.post("/", authMiddleware, validateRequest(createLessonSchema), asyncHandler(lessonController.createLesson));
lessonRouter.patch(
  "/courses/:courseId/lesson-order",
  authMiddleware,
  validateRequest(updateCourseLessonOrderSchema),
  asyncHandler(lessonController.reorderCourseLessons)
);
lessonRouter.put("/:lessonId", authMiddleware, validateRequest(updateLessonSchema), asyncHandler(lessonController.updateLesson));
lessonRouter.patch("/:lessonId/sort-order", authMiddleware, validateRequest(updateLessonOrderSchema), asyncHandler(lessonController.updateLessonOrder));
lessonRouter.delete("/:lessonId", authMiddleware, validateRequest(lessonIdParamSchema), asyncHandler(lessonController.deleteLesson));
