import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { asyncHandler } from "../../common/utils/async-handler";
import { validateRequest } from "../../common/middleware/validate-request";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentController } from "./enrollment.controller";
import { EnrollmentRepository } from "./enrollment.repository";
import { EnrollmentService } from "./enrollment.service";
import { createEnrollmentSchema } from "./enrollment.schema";

const enrollmentRepository = new EnrollmentRepository();
const courseRepository = new CourseRepository();
const enrollmentService = new EnrollmentService(enrollmentRepository, courseRepository);
const enrollmentController = new EnrollmentController(enrollmentService);

export const enrollmentRouter = Router();

enrollmentRouter.use(authMiddleware);

enrollmentRouter.get("/me", asyncHandler(enrollmentController.listMyEnrollments));
enrollmentRouter.post("/", validateRequest(createEnrollmentSchema), asyncHandler(enrollmentController.createEnrollment));
