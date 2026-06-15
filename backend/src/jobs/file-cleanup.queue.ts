import { createLogger } from "../config/logger";
import { FileCleanupService } from "../modules/upload/file-cleanup.service";
import { createWorker } from "./base.queue";

const queueName = "file-cleanup";
const log = createLogger("FileCleanupWorker");

const fileCleanupService = new FileCleanupService();

export const fileCleanupWorker = createWorker(queueName, async (job) => {
  const result = await fileCleanupService.removeOrphanUploads();
  log.info("File cleanup completed", { jobId: job.id, ...result });
});
