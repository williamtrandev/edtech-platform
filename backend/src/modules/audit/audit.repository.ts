import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type AuditLogFilters = {
  search?: string;
  action?: string;
  entityType?: string;
};

export class AuditRepository {
  private readonly auditSelect = {
    id: true,
    actorId: true,
    action: true,
    entityType: true,
    entityId: true,
    metadata: true,
    createdAt: true,
    actor: {
      select: {
        id: true,
        email: true,
        role: true
      }
    }
  } satisfies Prisma.AuditLogSelect;

  async create(data: Prisma.AuditLogCreateInput) {
    return prisma.auditLog.create({
      data,
      select: this.auditSelect
    });
  }

  async findMany(page: number, limit: number, filters: AuditLogFilters = {}) {
    const skip = (page - 1) * limit;
    const q = filters.search?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(q
        ? {
            OR: [
              { actorId: { contains: q, mode: "insensitive" } },
              { entityId: { contains: q, mode: "insensitive" } },
              { action: { contains: q, mode: "insensitive" } },
              { entityType: { contains: q, mode: "insensitive" } },
              { actor: { email: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    };

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        select: this.auditSelect,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    return { items, total };
  }
}
