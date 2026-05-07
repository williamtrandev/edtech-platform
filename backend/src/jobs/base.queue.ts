import { Job, Queue, Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { BaseJobPayload } from "./queue.types";

export function createQueue(name: string) {
  return new Queue<BaseJobPayload>(name, {
    connection: redisConnection
  });
}

export function createWorker(
  name: string,
  processor: (job: Job<BaseJobPayload>) => Promise<void>
) {
  return new Worker<BaseJobPayload>(name, processor, {
    connection: redisConnection
  });
}
