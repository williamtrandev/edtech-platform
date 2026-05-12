import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middleware/validate-request";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { LessonController } from "./lesson.controller";
import { LessonRepository } from "./lesson.repository";
import { LessonService } from "./lesson.service";
import { courseLessonsParamSchema, createLessonSchema } from "./lesson.schema";

const lessonRepository = new LessonRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const lessonService = new LessonService(lessonRepository, courseRepository, enrollmentRepository);
const lessonController = new LessonController(lessonService);

export const lessonRouter = Router();

lessonRouter.use(authMiddleware);

lessonRouter.get(
  "/courses/:courseId/lessons",
  validateRequest(courseLessonsParamSchema),
  asyncHandler(lessonController.listLessonsByCourse)
);
lessonRouter.post("/", validateRequest(createLessonSchema), asyncHandler(lessonController.createLesson));
