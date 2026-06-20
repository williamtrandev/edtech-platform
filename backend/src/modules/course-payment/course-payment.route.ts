import { Router } from "express";
import { authMiddleware } from "../../common/middleware/auth-middleware";
import { validateRequest } from "../../common/middleware/validate-request";
import { asyncHandler } from "../../common/utils/async-handler";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { UserRepository } from "../user/user.repository";
import { CoursePaymentController } from "./course-payment.controller";
import { CoursePaymentRepository } from "./course-payment.repository";
import {
  coursePaymentStatusSchema,
  createCoursePaymentSchema,
  listCoursePaymentProvidersSchema,
  listMyCoursePaymentsSchema,
  mockReturnSchema
} from "./course-payment.schema";
import { CoursePaymentService } from "./course-payment.service";

const coursePaymentRepository = new CoursePaymentRepository();
const courseRepository = new CourseRepository();
const enrollmentRepository = new EnrollmentRepository();
const userRepository = new UserRepository();
const coursePaymentService = new CoursePaymentService(
  coursePaymentRepository,
  courseRepository,
  enrollmentRepository,
  userRepository
);
const coursePaymentController = new CoursePaymentController(coursePaymentService);

export const coursePaymentRouter = Router();

// --- Public gateway callbacks (must precede authMiddleware) ---

// Stripe needs the raw body to verify the webhook signature.
// The raw bytes are captured by the express.json `verify` hook in app.ts (req.rawBody).
coursePaymentRouter.post("/webhooks/stripe", asyncHandler(coursePaymentController.stripeWebhook));
coursePaymentRouter.get("/stripe/return", asyncHandler(coursePaymentController.stripeReturn));
coursePaymentRouter.get("/vnpay/return", asyncHandler(coursePaymentController.vnpayReturn));
coursePaymentRouter.get("/vnpay/ipn", asyncHandler(coursePaymentController.vnpayIpn));
coursePaymentRouter.get("/mock/return", validateRequest(mockReturnSchema), asyncHandler(coursePaymentController.mockReturn));

// --- Authenticated routes ---

coursePaymentRouter.use(authMiddleware);

coursePaymentRouter.get(
  "/history",
  validateRequest(listMyCoursePaymentsSchema),
  asyncHandler(coursePaymentController.listMyPayments)
);
coursePaymentRouter.get(
  "/providers",
  validateRequest(listCoursePaymentProvidersSchema),
  asyncHandler(coursePaymentController.listProviders)
);
coursePaymentRouter.get("/me", validateRequest(coursePaymentStatusSchema), asyncHandler(coursePaymentController.getMyPaymentStatus));
coursePaymentRouter.post("/", validateRequest(createCoursePaymentSchema), asyncHandler(coursePaymentController.createCoursePayment));
