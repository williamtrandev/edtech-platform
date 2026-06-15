import { createLogger } from "../config/logger";
import { analyticsWorker } from "./analytics.queue";
import { certificatePdfWorker } from "./certificate-pdf.queue";
import { examGradingWorker } from "./exam-grading.queue";
import { fileCleanupWorker } from "./file-cleanup.queue";
import { notificationEmailWorker } from "./notification-email.queue";
import { scheduleRepeatingJobs } from "./scheduler";

const log = createLogger("Jobs");

export function initializeWorkers(): void {
  examGradingWorker.on("completed", (job) => {
    log.info("Job completed", { queue: "exam-grading", jobId: job.id });
  });

  examGradingWorker.on("failed", (job, err) => {
    log.error("Job failed", {
      queue: "exam-grading",
      jobId: job?.id,
      message: err.message
    });
  });

  analyticsWorker.on("completed", (job) => {
    log.info("Job completed", { queue: "analytics-processing", jobId: job.id });
  });

  analyticsWorker.on("failed", (job, err) => {
    log.error("Job failed", {
      queue: "analytics-processing",
      jobId: job?.id,
      message: err.message
    });
  });

  notificationEmailWorker.on("completed", (job) => {
    log.info("Job completed", { queue: "notification-email", jobId: job.id });
  });

  notificationEmailWorker.on("failed", (job, err) => {
    log.error("Job failed", {
      queue: "notification-email",
      jobId: job?.id,
      message: err.message
    });
  });

  certificatePdfWorker.on("completed", (job) => {
    log.info("Job completed", { queue: "certificate-pdf", jobId: job.id });
  });

  certificatePdfWorker.on("failed", (job, err) => {
    log.error("Job failed", {
      queue: "certificate-pdf",
      jobId: job?.id,
      message: err.message
    });
  });

  fileCleanupWorker.on("completed", (job) => {
    log.info("Job completed", { queue: "file-cleanup", jobId: job.id });
  });

  fileCleanupWorker.on("failed", (job, err) => {
    log.error("Job failed", {
      queue: "file-cleanup",
      jobId: job?.id,
      message: err.message
    });
  });

  void scheduleRepeatingJobs().catch((error: unknown) => {
    log.error("Failed to schedule repeating jobs", {
      message: error instanceof Error ? error.message : String(error)
    });
  });
}
