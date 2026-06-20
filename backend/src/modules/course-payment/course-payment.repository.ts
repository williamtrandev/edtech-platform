import { CoursePaymentStatus, PaymentProvider, Prisma } from "@prisma/client";
import { COURSE_PAYMENT_STATUS } from "../../common/constants/payment";
import { prisma } from "../../config/prisma";

const coursePaymentSelect = {
  id: true,
  userId: true,
  courseId: true,
  amountCents: true,
  currency: true,
  status: true,
  provider: true,
  providerRef: true,
  metadata: true,
  idempotencyKey: true,
  createdAt: true,
  completedAt: true,
  failedAt: true
} satisfies Prisma.CoursePaymentSelect;

type PaymentMetadata = Record<string, unknown>;

export class CoursePaymentRepository {
  async findByUserAndIdempotencyKey(userId: string, idempotencyKey: string) {
    return prisma.coursePayment.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey
        }
      },
      select: coursePaymentSelect
    });
  }

  async findCompletedByUserAndCourse(userId: string, courseId: string) {
    return prisma.coursePayment.findFirst({
      where: {
        userId,
        courseId,
        status: COURSE_PAYMENT_STATUS.completed
      },
      orderBy: { completedAt: "desc" },
      select: coursePaymentSelect
    });
  }

  async findLatestByUserAndCourse(userId: string, courseId: string) {
    return prisma.coursePayment.findFirst({
      where: {
        userId,
        courseId
      },
      orderBy: { createdAt: "desc" },
      select: coursePaymentSelect
    });
  }

  async createPending(data: {
    userId: string;
    courseId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
    provider: PaymentProvider;
    providerRef?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.coursePayment.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        amountCents: data.amountCents,
        currency: data.currency,
        idempotencyKey: data.idempotencyKey,
        provider: data.provider,
        providerRef: data.providerRef ?? null,
        metadata: data.metadata,
        status: COURSE_PAYMENT_STATUS.pending
      },
      select: coursePaymentSelect
    });
  }

  async findById(id: string) {
    return prisma.coursePayment.findUnique({
      where: { id },
      select: coursePaymentSelect
    });
  }

  async findByProviderRef(providerRef: string) {
    return prisma.coursePayment.findFirst({
      where: { providerRef },
      orderBy: { createdAt: "desc" },
      select: coursePaymentSelect
    });
  }

  async updateProviderRef(id: string, providerRef: string, metadata?: PaymentMetadata) {
    return prisma.coursePayment.update({
      where: { id },
      data: { providerRef, ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {}) },
      select: coursePaymentSelect
    });
  }

  async markCompleted(id: string, metadata?: PaymentMetadata) {
    return prisma.coursePayment.update({
      where: { id },
      data: {
        status: COURSE_PAYMENT_STATUS.completed as CoursePaymentStatus,
        completedAt: new Date(),
        ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {})
      },
      select: coursePaymentSelect
    });
  }

  async markFailed(id: string, metadata?: PaymentMetadata) {
    return prisma.coursePayment.update({
      where: { id },
      data: {
        status: COURSE_PAYMENT_STATUS.failed as CoursePaymentStatus,
        failedAt: new Date(),
        ...(metadata !== undefined ? { metadata: metadata as Prisma.InputJsonValue } : {})
      },
      select: coursePaymentSelect
    });
  }

  async findCompletedByUser(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.coursePayment.findMany({
        where: {
          userId,
          status: COURSE_PAYMENT_STATUS.completed
        },
        orderBy: { completedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          courseId: true,
          amountCents: true,
          currency: true,
          status: true,
          provider: true,
          completedAt: true,
          createdAt: true,
          course: {
            select: {
              id: true,
              title: true,
              coverImageUrl: true
            }
          }
        }
      }),
      prisma.coursePayment.count({
        where: {
          userId,
          status: COURSE_PAYMENT_STATUS.completed
        }
      })
    ]);

    return { items, total };
  }
}
