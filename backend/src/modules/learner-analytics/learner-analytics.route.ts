import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseProgressRepository } from "../progress/course-progress.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { ProgressRepository } from "../progress/progress.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { validateRequest } from "../../common/middleware/validate-request";
import { LearnerAnalyticsController } from "./learner-analytics.controller";
import { LearnerAnalyticsRepository } from "./learner-analytics.repository";
import { LearnerAnalyticsService } from "./learner-analytics.service";
import { courseLearnerAnalyticsParamSchema } from "./learner-analytics.schema";

const learnerAnalyticsRepository = new LearnerAnalyticsRepository();
const enrollmentRepository = new EnrollmentRepository();
const courseProgressService = new CourseProgressService(new ProgressRepository(), new CourseProgressRepository());
const learnerAnalyticsService = new LearnerAnalyticsService(
  learnerAnalyticsRepository,
  enrollmentRepository,
  courseProgressService
);
const learnerAnalyticsController = new LearnerAnalyticsController(learnerAnalyticsService);

export const learnerAnalyticsRouter = Router();

learnerAnalyticsRouter.use(authMiddleware);

learnerAnalyticsRouter.get("/me", asyncHandler(learnerAnalyticsController.getMyAnalytics));
learnerAnalyticsRouter.get(
  "/courses/:courseId/me",
  validateRequest(courseLearnerAnalyticsParamSchema),
  asyncHandler(learnerAnalyticsController.getMyCourseAnalytics)
);
