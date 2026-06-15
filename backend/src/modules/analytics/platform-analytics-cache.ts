import { redisConnection } from "../../config/redis";
import { ANALYTICS_CACHE } from "../../common/constants/analytics-cache";
import type { PlatformAnalyticsRepository } from "./platform-analytics.repository";

export type PlatformAnalyticsOverview = Awaited<ReturnType<PlatformAnalyticsRepository["getOverview"]>>;
export type PlatformAnalyticsCachePayload = {
  overview: PlatformAnalyticsOverview;
  generatedAt: string;
};

export async function getCachedPlatformOverview(): Promise<PlatformAnalyticsCachePayload | null> {
  const raw = await redisConnection.get(ANALYTICS_CACHE.platformOverviewKey);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as PlatformAnalyticsCachePayload;
}

export async function setCachedPlatformOverview(overview: PlatformAnalyticsOverview): Promise<void> {
  const payload: PlatformAnalyticsCachePayload = {
    overview,
    generatedAt: new Date().toISOString()
  };

  await redisConnection.set(
    ANALYTICS_CACHE.platformOverviewKey,
    JSON.stringify(payload),
    "EX",
    ANALYTICS_CACHE.ttlSeconds
  );
}
