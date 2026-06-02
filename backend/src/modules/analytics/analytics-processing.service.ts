import { PlatformAnalyticsRepository } from "./platform-analytics.repository";
import { getCachedPlatformOverview, setCachedPlatformOverview } from "./platform-analytics-cache";

export class AnalyticsProcessingService {
  constructor(private readonly platformAnalyticsRepository: PlatformAnalyticsRepository) {}

  async refreshPlatformOverview() {
    const overview = await this.platformAnalyticsRepository.getOverview();
    await setCachedPlatformOverview(overview);
    return {
      overview,
      generatedAt: new Date().toISOString(),
      source: "live" as const
    };
  }

  async getPlatformOverview(forceRefresh = false) {
    if (forceRefresh) {
      return this.refreshPlatformOverview();
    }

    const cached = await getCachedPlatformOverview();
    if (cached) {
      return {
        overview: cached.overview,
        generatedAt: cached.generatedAt,
        source: "cache" as const
      };
    }

    return this.refreshPlatformOverview();
  }
}
