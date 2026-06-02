import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { LiveSessionController } from "./live-session.controller";
import { LiveSessionRepository } from "./live-session.repository";
import { listCourseLiveSessionsSchema, listMyLiveSessionsSchema } from "./live-session.schema";
import { LiveSessionService } from "./live-session.service";

const liveSessionRepository = new LiveSessionRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const liveSessionService = new LiveSessionService(liveSessionRepository, courseRepository, enrollmentRepository);
const liveSessionController = new LiveSessionController(liveSessionService);

export const liveSessionRouter = Router();

liveSessionRouter.use(authMiddleware);

liveSessionRouter.get("/me", validateRequest(listMyLiveSessionsSchema), asyncHandler(liveSessionController.listMyLiveSessions));

export const courseLiveSessionRouter = Router({ mergeParams: true });

courseLiveSessionRouter.get(
  "/",
  authMiddleware,
  validateRequest(listCourseLiveSessionsSchema),
  asyncHandler(liveSessionController.listCourseLiveSessions)
);
