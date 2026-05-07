import { createQueue, createWorker } from "./base.queue";

const queueName = "analytics-processing";

export const analyticsQueue = createQueue(queueName);

export const analyticsWorker = createWorker(queueName, async (job) => {
  // Skeleton worker; replace with real processing logic.
  console.info("[analyticsWorker] received job", { id: job.id, name: job.name });
});
