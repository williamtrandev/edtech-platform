import { ANALYTICS_JOB, ANALYTICS_JOB_OPTIONS } from "../common/constants/analytics-cache";
import { createQueue } from "./base.queue";

const queueName = "analytics-processing";

export type AnalyticsJobPayload = {
  type?: string;
};

export const analyticsQueue = createQueue(queueName);

export const analyticsJobOptions = {
  attempts: ANALYTICS_JOB_OPTIONS.attempts,
  backoff: {
    type: "exponential" as const,
    delay: ANALYTICS_JOB_OPTIONS.backoffDelayMs
  },
  removeOnComplete: 25,
  removeOnFail: 100
};

export async function enqueuePlatformOverviewRefresh() {
  await analyticsQueue.add(ANALYTICS_JOB.platformOverview, { type: ANALYTICS_JOB.platformOverview }, analyticsJobOptions);
}
