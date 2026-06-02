import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CoursePaymentController } from "./course-payment.controller";
import { CoursePaymentRepository } from "./course-payment.repository";
import { coursePaymentStatusSchema, createCoursePaymentSchema } from "./course-payment.schema";
import { CoursePaymentService } from "./course-payment.service";

const coursePaymentRepository = new CoursePaymentRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const coursePaymentService = new CoursePaymentService(coursePaymentRepository, courseRepository, enrollmentRepository);
const coursePaymentController = new CoursePaymentController(coursePaymentService);

export const coursePaymentRouter = Router();

coursePaymentRouter.use(authMiddleware);

coursePaymentRouter.get("/me", validateRequest(coursePaymentStatusSchema), asyncHandler(coursePaymentController.getMyPaymentStatus));
coursePaymentRouter.post("/", validateRequest(createCoursePaymentSchema), asyncHandler(coursePaymentController.createCoursePayment));
