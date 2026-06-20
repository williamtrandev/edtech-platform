import { PaymentProvider } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { COURSE_STATUS } from "../../common/constants/business";
import { COURSE_PAYMENT_IDEMPOTENCY, PAYMENT_PROVIDER } from "../../common/constants/payment";
import { redisConnection } from "../../config/redis";
import { env } from "../../config/env";
import { createLogger } from "../../config/logger";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { UserRepository } from "../user/user.repository";
import { CoursePaymentRepository } from "./course-payment.repository";
import { getAvailableGateways, getGateway, stripeGateway, vnpayGateway } from "./gateways/registry";

const logger = createLogger("course-payment");

interface CheckoutContext {
  apiBaseUrl: string;
  clientIp: string;
}

export class CoursePaymentService {
  constructor(
    private readonly coursePaymentRepository: CoursePaymentRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly userRepository?: UserRepository
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

  /** Providers available to pay for a course, filtered by enabled gateways + course currency. */
  async listProviders(user: Express.UserClaims | undefined, courseId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }

    const isFree = !course.priceCents || course.priceCents <= 0;
    const providers = isFree ? [] : getAvailableGateways(course.currency).map((g) => g.provider);

    return {
      courseId,
      isFree,
      priceCents: course.priceCents,
      currency: course.currency,
      providers
    };
  }

  async listMyPayments(user: Express.UserClaims | undefined, page: number, limit: number) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { items, total } = await this.coursePaymentRepository.findCompletedByUser(user.id, page, limit);

    return {
      items: items.map((payment) => ({
        id: payment.id,
        courseId: payment.courseId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        completedAt: payment.completedAt,
        createdAt: payment.createdAt,
        course: payment.course
      })),
      pagination: {
        page,
        limit,
        total
      }
    };
  }

  async createCoursePayment(
    user: Express.UserClaims | undefined,
    courseId: string,
    provider: PaymentProvider,
    idempotencyKey: string | undefined,
    ctx: CheckoutContext
  ) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (!idempotencyKey?.trim()) {
      throw new AppError("Idempotency-Key header is required", 400, "IDEMPOTENCY_KEY_REQUIRED");
    }

    const key = idempotencyKey.trim();
    const cacheKey = `idempotency:course-payment:${user.id}:${key}`;
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
      const response = { alreadyPaid: true, payment: existingCompleted };
      await redisConnection.set(cacheKey, JSON.stringify(response), "EX", COURSE_PAYMENT_IDEMPOTENCY.ttlSeconds);
      return response;
    }

    const gateway = getGateway(provider);
    if (!gateway.isEnabled()) {
      throw new AppError(`Payment provider ${provider} is not available`, 409, "PROVIDER_NOT_AVAILABLE");
    }
    if (!gateway.supportsCurrency(course.currency)) {
      throw new AppError(
        `Provider ${provider} does not support ${course.currency}`,
        409,
        "PROVIDER_CURRENCY_UNSUPPORTED"
      );
    }

    // Reuse an existing pending payment for this idempotency key, else create one.
    let payment = await this.coursePaymentRepository.findByUserAndIdempotencyKey(user.id, key);
    if (!payment) {
      try {
        payment = await this.coursePaymentRepository.createPending({
          userId: user.id,
          courseId,
          amountCents: course.priceCents,
          currency: course.currency,
          idempotencyKey: key,
          provider
        });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
          payment = await this.coursePaymentRepository.findByUserAndIdempotencyKey(user.id, key);
        }
        if (!payment) {
          throw error;
        }
      }
    }

    const userRecord = this.userRepository ? await this.userRepository.findById(user.id) : null;

    const checkout = await gateway.createCheckout({
      paymentId: payment.id,
      courseId,
      courseTitle: course.title,
      userId: user.id,
      userEmail: userRecord?.email ?? user.email ?? null,
      amountCents: course.priceCents,
      currency: course.currency,
      clientIp: ctx.clientIp,
      apiBaseUrl: ctx.apiBaseUrl,
      appUrl: env.APP_PUBLIC_URL
    });

    payment = await this.coursePaymentRepository.updateProviderRef(
      payment.id,
      checkout.providerRef,
      checkout.metadata ?? undefined
    );

    const response = { alreadyPaid: false, redirectUrl: checkout.redirectUrl, provider, payment };
    await redisConnection.set(cacheKey, JSON.stringify(response), "EX", COURSE_PAYMENT_IDEMPOTENCY.ttlSeconds);
    return response;
  }

  // --- Gateway callbacks ---

  async handleStripeWebhook(rawBody: Buffer | string, signature: string) {
    const result = stripeGateway.verifyWebhook(rawBody, signature);
    if (!result) {
      return { received: true, handled: false };
    }

    const payment = result.paymentId
      ? await this.coursePaymentRepository.findById(result.paymentId)
      : await this.coursePaymentRepository.findByProviderRef(result.providerRef);

    if (!payment) {
      logger.warn("Stripe webhook for unknown payment", { providerRef: result.providerRef });
      return { received: true, handled: false };
    }

    if (result.status === "completed") {
      await this.completePayment(payment.id, result.raw);
    } else if (result.status === "failed") {
      await this.coursePaymentRepository.markFailed(payment.id, result.raw);
    }

    return { received: true, handled: true };
  }

  /** Browser return from Stripe Checkout. Verifies the session and completes if paid. */
  async handleStripeReturn(sessionId: string) {
    const result = await stripeGateway.retrieveSession(sessionId);
    const payment = result.paymentId
      ? await this.coursePaymentRepository.findById(result.paymentId)
      : await this.coursePaymentRepository.findByProviderRef(result.providerRef);

    if (!payment) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    if (result.status === "completed") {
      await this.completePayment(payment.id, result.raw);
      return { success: true, courseId: payment.courseId };
    }
    return { success: false, courseId: payment.courseId };
  }

  async handleVnpayReturn(query: Record<string, unknown>) {
    const result = vnpayGateway.verifyCallback(query);
    const payment = await this.coursePaymentRepository.findById(result.providerRef);
    if (!payment) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    const amountMatches = Number(result.raw.amount) === payment.amountCents * 100;

    if (result.status === "completed" && amountMatches) {
      await this.completePayment(payment.id, result.raw);
      return { success: true, courseId: payment.courseId };
    }

    if (payment.status !== "COMPLETED") {
      await this.coursePaymentRepository.markFailed(payment.id, result.raw);
    }
    return { success: false, courseId: payment.courseId };
  }

  /** Authoritative server-to-server confirmation. Returns VNPay's expected response codes. */
  async handleVnpayIpn(query: Record<string, unknown>) {
    let result;
    try {
      result = vnpayGateway.verifyCallback(query);
    } catch {
      return { RspCode: "97", Message: "Invalid signature" };
    }

    const payment = await this.coursePaymentRepository.findById(result.providerRef);
    if (!payment) {
      return { RspCode: "01", Message: "Order not found" };
    }
    if (Number(result.raw.amount) !== payment.amountCents * 100) {
      return { RspCode: "04", Message: "Invalid amount" };
    }
    if (payment.status === "COMPLETED") {
      return { RspCode: "02", Message: "Order already confirmed" };
    }

    if (result.status === "completed") {
      await this.completePayment(payment.id, result.raw);
    } else {
      await this.coursePaymentRepository.markFailed(payment.id, result.raw);
    }

    return { RspCode: "00", Message: "Confirm Success" };
  }

  async handleMockReturn(paymentId: string) {
    const payment = await this.coursePaymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }
    if (payment.provider !== PAYMENT_PROVIDER.mock) {
      throw new AppError("Not a mock payment", 400, "NOT_MOCK_PAYMENT");
    }
    await this.completePayment(payment.id, { mock: true });
    return { success: true, courseId: payment.courseId };
  }

  /** Mark a payment completed (idempotent) and auto-enroll the buyer. */
  private async completePayment(paymentId: string, metadata?: Record<string, unknown>) {
    const payment = await this.coursePaymentRepository.findById(paymentId);
    if (!payment) {
      throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
    }

    if (payment.status !== "COMPLETED") {
      await this.coursePaymentRepository.markCompleted(payment.id, metadata);
    }

    try {
      await this.enrollmentRepository.create(payment.userId, payment.courseId);
      logger.info("Auto-enrolled after payment", { userId: payment.userId, courseId: payment.courseId });
    } catch (error) {
      if (!(error instanceof PrismaClientKnownRequestError && error.code === "P2002")) {
        logger.error("Auto-enroll after payment failed", {
          userId: payment.userId,
          courseId: payment.courseId,
          error: (error as Error).message
        });
      }
    }

    return payment;
  }
}
