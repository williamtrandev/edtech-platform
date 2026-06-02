import { redisConnection } from "../../config/redis";
import { ANALYTICS_CACHE } from "../../common/constants/analytics-cache";
import type { PlatformAnalyticsRepository } from "./platform-analytics.repository";

export type PlatformAnalyticsOverview = Awaited<ReturnType<PlatformAnalyticsRepository["getOverview"]>>;

export async function getCachedPlatformOverview(): Promise<PlatformAnalyticsOverview | null> {
  const raw = await redisConnection.get(ANALYTICS_CACHE.platformOverviewKey);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as PlatformAnalyticsOverview;
}

export async function setCachedPlatformOverview(overview: PlatformAnalyticsOverview): Promise<void> {
  await redisConnection.set(
    ANALYTICS_CACHE.platformOverviewKey,
    JSON.stringify(overview),
    "EX",
    ANALYTICS_CACHE.ttlSeconds
  );
}
