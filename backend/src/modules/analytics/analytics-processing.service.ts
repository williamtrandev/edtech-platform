import { PlatformAnalyticsRepository } from "./platform-analytics.repository";
import { getCachedPlatformOverview, setCachedPlatformOverview } from "./platform-analytics-cache";

export class AnalyticsProcessingService {
  constructor(private readonly platformAnalyticsRepository: PlatformAnalyticsRepository) {}

  async refreshPlatformOverview() {
    const overview = await this.platformAnalyticsRepository.getOverview();
    await setCachedPlatformOverview(overview);
    return overview;
  }

  async getPlatformOverview() {
    const cached = await getCachedPlatformOverview();
    if (cached) {
      return cached;
    }

    return this.refreshPlatformOverview();
  }
}
