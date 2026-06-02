import { ANALYTICS_JOB } from "../common/constants/analytics-cache";
import { FILE_CLEANUP_JOB } from "../common/constants/upload";
import { createLogger } from "../config/logger";
import { analyticsJobOptions, analyticsQueue } from "./analytics.jobs";
import { fileCleanupJobOptions, fileCleanupQueue } from "./file-cleanup.jobs";

const log = createLogger("JobScheduler");

async function ensureRepeatingJob(
  queue: typeof analyticsQueue,
  name: string,
  data: Record<string, unknown>,
  options: Parameters<typeof analyticsQueue.add>[2]
) {
  const repeatables = await queue.getRepeatableJobs();
  const exists = repeatables.some((entry) => entry.name === name);
  if (exists) {
    return;
  }

  await queue.add(name, data, options);
}

export async function scheduleRepeatingJobs(): Promise<void> {
  await ensureRepeatingJob(
    analyticsQueue,
    ANALYTICS_JOB.platformOverview,
    { type: ANALYTICS_JOB.platformOverview },
    {
      ...analyticsJobOptions,
      repeat: {
        every: 5 * 60 * 1000
      }
    }
  );

  await ensureRepeatingJob(fileCleanupQueue, FILE_CLEANUP_JOB.name, {}, {
    ...fileCleanupJobOptions,
    repeat: {
      pattern: "0 4 * * *"
    }
  });

  log.info("Repeating jobs scheduled", {
    analyticsEveryMs: 5 * 60 * 1000,
    fileCleanupCron: "0 4 * * *"
  });
}
