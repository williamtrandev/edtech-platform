import { CoursePaymentStatus, Prisma } from "@prisma/client";
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
  idempotencyKey: true,
  createdAt: true,
  completedAt: true
} satisfies Prisma.CoursePaymentSelect;

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
    providerRef?: string | null;
  }) {
    return prisma.coursePayment.create({
      data: {
        userId: data.userId,
        courseId: data.courseId,
        amountCents: data.amountCents,
        currency: data.currency,
        idempotencyKey: data.idempotencyKey,
        providerRef: data.providerRef ?? null,
        status: COURSE_PAYMENT_STATUS.pending
      },
      select: coursePaymentSelect
    });
  }

  async markCompleted(id: string) {
    return prisma.coursePayment.update({
      where: { id },
      data: {
        status: COURSE_PAYMENT_STATUS.completed as CoursePaymentStatus,
        completedAt: new Date()
      },
      select: coursePaymentSelect
    });
  }
}
