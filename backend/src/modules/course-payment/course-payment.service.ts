import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { COURSE_STATUS } from "../../common/constants/business";
import {
  COURSE_PAYMENT_IDEMPOTENCY,
  COURSE_PAYMENT_STATUS,
  PAYMENT_PROVIDER
} from "../../common/constants/payment";
import { redisConnection } from "../../config/redis";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CoursePaymentRepository } from "./course-payment.repository";

export class CoursePaymentService {
  constructor(
    private readonly coursePaymentRepository: CoursePaymentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository
  ) {}

  async getMyPaymentStatus(user: Express.UserClaims | undefined, courseId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const isFree = !course.priceCents || course.priceCents <= 0;
    if (isFree) {
      return {
        courseId,
        isFree: true,
        priceCents: 0,
        currency: course.currency,
        hasCompletedPayment: true
      };
    }

    const payment = await this.coursePaymentRepository.findCompletedByUserAndCourse(user.id, courseId);
    return {
      courseId,
      isFree: false,
      priceCents: course.priceCents,
      currency: course.currency,
      hasCompletedPayment: Boolean(payment),
      latestPayment: payment
    };
  }

  async createCoursePayment(user: Express.UserClaims | undefined, courseId: string, idempotencyKey: string | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (!idempotencyKey?.trim()) {
      throw new AppError("Idempotency-Key header is required", 400, "IDEMPOTENCY_KEY_REQUIRED");
    }

    const cacheKey = `idempotency:course-payment:${user.id}:${idempotencyKey.trim()}`;
    const cached = await redisConnection.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available for purchase", 409, "COURSE_NOT_PUBLISHED");
    }
    if (!course.priceCents || course.priceCents <= 0) {
      throw new AppError("Course is free", 409, "COURSE_IS_FREE");
    }

    const existingEnrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
    if (existingEnrollment) {
      throw new AppError("Already enrolled in this course", 409, "ALREADY_ENROLLED");
    }

    const existingCompleted = await this.coursePaymentRepository.findCompletedByUserAndCourse(user.id, courseId);
    if (existingCompleted) {
      const response = { payment: existingCompleted };
      await redisConnection.set(cacheKey, JSON.stringify(response), "EX", COURSE_PAYMENT_IDEMPOTENCY.ttlSeconds);
      return response;
    }

    const existingByKey = await this.coursePaymentRepository.findByUserAndIdempotencyKey(user.id, idempotencyKey.trim());
    if (existingByKey) {
      const response = { payment: existingByKey };
      await redisConnection.set(cacheKey, JSON.stringify(response), "EX", COURSE_PAYMENT_IDEMPOTENCY.ttlSeconds);
      return response;
    }

    try {
      const pending = await this.coursePaymentRepository.createPending({
        userId: user.id,
        courseId,
        amountCents: course.priceCents,
        currency: course.currency,
        idempotencyKey: idempotencyKey.trim(),
        providerRef: `mock_${Date.now()}`
      });

      const completed = await this.coursePaymentRepository.markCompleted(pending.id);
      const response = {
        payment: {
          ...completed,
          provider: PAYMENT_PROVIDER.mock
        }
      };
      await redisConnection.set(cacheKey, JSON.stringify(response), "EX", COURSE_PAYMENT_IDEMPOTENCY.ttlSeconds);
      return response;
    } catch (error: unknown) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.coursePaymentRepository.findByUserAndIdempotencyKey(user.id, idempotencyKey.trim());
        if (existing) {
          const response = { payment: existing };
          await redisConnection.set(cacheKey, JSON.stringify(response), "EX", COURSE_PAYMENT_IDEMPOTENCY.ttlSeconds);
          return response;
        }
      }
      throw error;
    }
  }
}
