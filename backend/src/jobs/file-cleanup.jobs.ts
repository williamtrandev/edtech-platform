import { FILE_CLEANUP_JOB } from "../common/constants/upload";
import { createQueue } from "./base.queue";

const queueName = "file-cleanup";

export const fileCleanupQueue = createQueue(queueName);

export const fileCleanupJobOptions = {
  attempts: FILE_CLEANUP_JOB.attempts,
  backoff: {
    type: "exponential" as const,
    delay: FILE_CLEANUP_JOB.backoffDelayMs
  },
  removeOnComplete: 50,
  removeOnFail: 100
};

export async function enqueueFileCleanupJob() {
  await fileCleanupQueue.add(FILE_CLEANUP_JOB.name, {}, fileCleanupJobOptions);
}
