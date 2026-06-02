import { ANALYTICS_JOB } from "../common/constants/analytics-cache";
import { createLogger } from "../config/logger";
import { AnalyticsProcessingService } from "../modules/analytics/analytics-processing.service";
import { PlatformAnalyticsRepository } from "../modules/analytics/platform-analytics.repository";
import type { AnalyticsJobPayload } from "./analytics.jobs";
import { createWorker } from "./base.queue";

const queueName = "analytics-processing";
const log = createLogger("AnalyticsWorker");

const analyticsProcessingService = new AnalyticsProcessingService(new PlatformAnalyticsRepository());

export const analyticsWorker = createWorker(queueName, async (job) => {
  const payload = job.data as AnalyticsJobPayload;
  const jobType = payload.type ?? job.name;

  if (jobType === ANALYTICS_JOB.platformOverview) {
    const result = await analyticsProcessingService.refreshPlatformOverview();
    log.info("Platform overview refreshed", {
      jobId: job.id,
      users: result.overview.users.total,
      courses: result.overview.courses.total,
      source: result.source
    });
    return;
  }

  throw new Error(`ANALYTICS_UNKNOWN_JOB_TYPE:${jobType}`);
});
