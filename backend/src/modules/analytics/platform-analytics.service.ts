import { USER_ROLE } from "../../common/constants/business";
import { AppError } from "../../common/errors/app-error";
import { PlatformAnalyticsRepository } from "./platform-analytics.repository";

export class PlatformAnalyticsService {
  constructor(private readonly platformAnalyticsRepository: PlatformAnalyticsRepository) {}

  async getOverview(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    return this.platformAnalyticsRepository.getOverview();
  }
}
