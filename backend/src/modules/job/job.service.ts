import type { Job } from "bullmq";
import { USER_ROLE } from "../../common/constants/business";
import { AppError } from "../../common/errors/app-error";
import { createQueue } from "../../jobs/base.queue";
import type { BaseJobPayload } from "../../jobs/queue.types";

const MONITORED_QUEUES = [
  { name: "exam-grading", label: "Exam grading" },
  { name: "analytics-processing", label: "Analytics processing" }
] as const;

type QueueCountKey = "waiting" | "active" | "completed" | "failed" | "delayed" | "paused";

type QueueJobSummary = {
  id: string;
  name: string;
  attemptsMade: number;
  timestamp: string | null;
  failedReason: string | null;
};

function toQueueJobSummary(job: Job<BaseJobPayload>): QueueJobSummary {
  return {
    id: String(job.id ?? ""),
    name: job.name,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp ? new Date(job.timestamp).toISOString() : null,
    failedReason: job.failedReason ?? null
  };
}

export class JobService {
  private readonly queues = MONITORED_QUEUES.map((queue) => ({
    ...queue,
    client: createQueue(queue.name)
  }));

  async listQueues(user: Express.UserClaims | undefined, includeSamples: boolean) {
    this.assertAdmin(user);

    const items = await Promise.all(
      this.queues.map(async ({ client, label, name }) => {
        const counts = await client.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
        const [failedJobs, waitingJobs] = includeSamples
          ? await Promise.all([client.getFailed(0, 4), client.getWaiting(0, 4)])
          : [[], []];

        return {
          name,
          label,
          counts: this.normalizeCounts(counts),
          failedJobs: failedJobs.map(toQueueJobSummary),
          waitingJobs: waitingJobs.map(toQueueJobSummary)
        };
      })
    );

    return { items };
  }

  async retryFailedJob(user: Express.UserClaims | undefined, queueName: string, jobId: string) {
    this.assertAdmin(user);

    const queue = this.queues.find((item) => item.name === queueName);
    if (!queue) {
      throw new AppError("Queue not found", 404, "QUEUE_NOT_FOUND");
    }

    const job = await queue.client.getJob(jobId);
    if (!job) {
      throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
    }

    const state = await job.getState();
    if (state !== "failed") {
      throw new AppError("Only failed jobs can be retried", 409, "JOB_NOT_FAILED");
    }

    await job.retry("failed");

    return toQueueJobSummary(job);
  }

  private assertAdmin(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    if (user.role !== USER_ROLE.admin) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
  }

  private normalizeCounts(counts: Partial<Record<QueueCountKey, number>>): Record<QueueCountKey, number> {
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0
    };
  }
}
