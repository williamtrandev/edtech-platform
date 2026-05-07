import { analyticsWorker } from "./analytics.queue";

export function initializeWorkers(): void {
  analyticsWorker.on("completed", (job) => {
    console.info("[jobs] completed", { queue: "analytics-processing", jobId: job.id });
  });

  analyticsWorker.on("failed", (job, err) => {
    console.error("[jobs] failed", {
      queue: "analytics-processing",
      jobId: job?.id,
      message: err.message
    });
  });
}
