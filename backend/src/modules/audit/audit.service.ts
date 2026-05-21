import { USER_ROLE } from "../../common/constants/business";
import { AppError } from "../../common/errors/app-error";
import { AuditLogFilters, AuditRepository } from "./audit.repository";

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async listAuditLogs(user: Express.UserClaims | undefined, page: number, limit: number, filters: AuditLogFilters = {}) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const { items, total } = await this.auditRepository.findMany(page, limit, filters);
    return {
      items,
      pagination: {
        page,
        limit,
        total
      }
    };
  }
}
