import { Router } from "express";
import { authMiddleware, optionalAuthMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CourseProgressRepository } from "../progress/course-progress.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { ProgressRepository } from "../progress/progress.repository";
import { LearningPathController } from "./learning-path.controller";
import { LearningPathRepository } from "./learning-path.repository";
import {
  addLearningPathCourseSchema,
  createLearningPathSchema,
  learningPathIdParamSchema,
  listLearningPathsSchema,
  removeLearningPathCourseSchema,
  updateLearningPathSchema
} from "./learning-path.schema";
import { LearningPathService } from "./learning-path.service";

const learningPathRepository = new LearningPathRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const progressRepository = new ProgressRepository();
const courseProgressRepository = new CourseProgressRepository();
const courseProgressService = new CourseProgressService(progressRepository, courseProgressRepository);
const learningPathService = new LearningPathService(
  learningPathRepository,
  courseRepository,
  enrollmentRepository,
  courseProgressService
);
const learningPathController = new LearningPathController(learningPathService);

export const learningPathRouter = Router();

learningPathRouter.get(
  "/",
  optionalAuthMiddleware,
  validateRequest(listLearningPathsSchema),
  asyncHandler(learningPathController.listLearningPaths)
);

learningPathRouter.get(
  "/:id",
  optionalAuthMiddleware,
  validateRequest(learningPathIdParamSchema),
  asyncHandler(learningPathController.getLearningPath)
);

learningPathRouter.use(authMiddleware);

learningPathRouter.post("/", validateRequest(createLearningPathSchema), asyncHandler(learningPathController.createLearningPath));
learningPathRouter.patch("/:id", validateRequest(updateLearningPathSchema), asyncHandler(learningPathController.updateLearningPath));
learningPathRouter.post(
  "/:id/courses",
  validateRequest(addLearningPathCourseSchema),
  asyncHandler(learningPathController.addCourseToPath)
);
learningPathRouter.delete(
  "/:id/courses/:courseId",
  validateRequest(removeLearningPathCourseSchema),
  asyncHandler(learningPathController.removeCourseFromPath)
);
