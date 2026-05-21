import { analyticsWorker } from "./analytics.queue";
import { examGradingWorker } from "./exam-grading.queue";

export function initializeWorkers(): void {
  examGradingWorker.on("completed", (job) => {
    console.info("[jobs] completed", { queue: "exam-grading", jobId: job.id });
  });

  examGradingWorker.on("failed", (job, err) => {
    console.error("[jobs] failed", {
      queue: "exam-grading",
      jobId: job?.id,
      message: err.message
    });
  });

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
