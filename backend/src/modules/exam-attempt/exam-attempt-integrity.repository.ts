import { ExamAttemptEventType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { EXAM_INTEGRITY_SUSPICIOUS_EVENT_TYPES } from "../../common/constants/exam-integrity";

export type CreateIntegrityEventInput = {
  attemptId: string;
  type: ExamAttemptEventType;
  clientEventId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

export class ExamAttemptIntegrityRepository {
  async createEvent(event: CreateIntegrityEventInput) {
    if (event.clientEventId) {
      return prisma.examAttemptIntegrityEvent.upsert({
        where: {
          attemptId_clientEventId: {
            attemptId: event.attemptId,
            clientEventId: event.clientEventId
          }
        },
        create: {
          attemptId: event.attemptId,
          type: event.type,
          clientEventId: event.clientEventId,
          metadata: event.metadata ?? Prisma.JsonNull
        },
        update: {}
      });
    }

    return prisma.examAttemptIntegrityEvent.create({
      data: {
        attemptId: event.attemptId,
        type: event.type,
        metadata: event.metadata ?? Prisma.JsonNull
      }
    });
  }

  async createMany(events: CreateIntegrityEventInput[]) {
    const created = [];
    for (const event of events) {
      created.push(await this.createEvent(event));
    }
    return created;
  }

  async findByAttemptId(attemptId: string) {
    return prisma.examAttemptIntegrityEvent.findMany({
      where: { attemptId },
      select: {
        id: true,
        attemptId: true,
        type: true,
        clientEventId: true,
        metadata: true,
        createdAt: true
      },
      orderBy: { createdAt: "asc" }
    });
  }

  async countSuspiciousByAttemptIds(attemptIds: string[]) {
    if (attemptIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await prisma.examAttemptIntegrityEvent.groupBy({
      by: ["attemptId"],
      where: {
        attemptId: { in: attemptIds },
        type: { in: EXAM_INTEGRITY_SUSPICIOUS_EVENT_TYPES }
      },
      _count: { _all: true }
    });

    return new Map(rows.map((row) => [row.attemptId, row._count._all]));
  }
}
