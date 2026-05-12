import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middleware/validate-request";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ProgressController } from "./progress.controller";
import { ProgressRepository } from "./progress.repository";
import { ProgressService } from "./progress.service";
import { courseProgressParamSchema, createLessonProgressSchema } from "./progress.schema";

const progressRepository = new ProgressRepository();
const enrollmentRepository = new EnrollmentRepository();
const courseRepository = new CourseRepository();
const progressService = new ProgressService(progressRepository, enrollmentRepository, courseRepository);
const progressController = new ProgressController(progressService);

export const progressRouter = Router();

progressRouter.use(authMiddleware);

progressRouter.post("/", validateRequest(createLessonProgressSchema), asyncHandler(progressController.upsertLessonProgress));
progressRouter.get(
  "/courses/:courseId/me",
  validateRequest(courseProgressParamSchema),
  asyncHandler(progressController.getMyCourseProgress)
);
