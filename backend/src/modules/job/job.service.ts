import type { Job, Queue } from "bullmq";
import { USER_ROLE } from "../../common/constants/business";
import { JOB_MONITORING } from "../../common/constants/job";
import { AppError } from "../../common/errors/app-error";
import { createQueue } from "../../jobs/base.queue";
import type { BaseJobPayload } from "../../jobs/queue.types";

const MONITORED_QUEUES = [
  { name: "exam-grading", label: "Exam grading" },
  { name: "analytics-processing", label: "Analytics processing" },
  { name: "notification-email", label: "Notification email" },
  { name: "certificate-pdf", label: "Certificate PDF" },
  { name: "file-cleanup", label: "File cleanup" }
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

        const normalizedCounts = this.normalizeCounts(counts);

        return {
          name,
          label,
          counts: normalizedCounts,
          failureRate: this.computeFailureRate(normalizedCounts),
          failedJobs: failedJobs.map(toQueueJobSummary),
          waitingJobs: waitingJobs.map(toQueueJobSummary)
        };
      })
    );

    return { items };
  }

  async listFailedJobs(
    user: Express.UserClaims | undefined,
    queueName: string,
    page: number,
    limit: number
  ) {
    this.assertAdmin(user);

    const queue = this.getMonitoredQueue(queueName);
    const pageSize = Math.min(limit, JOB_MONITORING.failedJobsMaxPageSize);
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    const [jobs, totalItems] = await Promise.all([queue.client.getFailed(start, end), queue.client.getFailedCount()]);

    return {
      items: jobs.map(toQueueJobSummary),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize))
      }
    };
  }

  async retryFailedJob(user: Express.UserClaims | undefined, queueName: string, jobId: string) {
    this.assertAdmin(user);

    const queue = this.getMonitoredQueue(queueName);
    const job = await this.getFailedJobOrThrow(queue.client, jobId);
    await job.retry("failed");

    return toQueueJobSummary(job);
  }

  async retryAllFailedJobs(user: Express.UserClaims | undefined, queueName: string, limit?: number) {
    this.assertAdmin(user);

    const queue = this.getMonitoredQueue(queueName);
    const batchLimit = Math.min(limit ?? JOB_MONITORING.retryAllBatchLimit, JOB_MONITORING.retryAllBatchLimit);
    const jobs = await queue.client.getFailed(0, batchLimit - 1);
    const retriedJobIds: string[] = [];

    for (const job of jobs) {
      const state = await job.getState();
      if (state !== "failed") {
        continue;
      }

      await job.retry("failed");
      retriedJobIds.push(String(job.id ?? ""));
    }

    return {
      retriedCount: retriedJobIds.length,
      jobIds: retriedJobIds
    };
  }

  async discardFailedJob(user: Express.UserClaims | undefined, queueName: string, jobId: string) {
    this.assertAdmin(user);

    const queue = this.getMonitoredQueue(queueName);
    const job = await this.getFailedJobOrThrow(queue.client, jobId);
    await job.remove();

    return { id: jobId, removed: true };
  }

  async moveFailedJobToDeadLetter(user: Express.UserClaims | undefined, queueName: string, jobId: string) {
    this.assertAdmin(user);

    const queue = this.getMonitoredQueue(queueName);
    const job = await this.getFailedJobOrThrow(queue.client, jobId);
    const deadLetterQueue = createQueue(this.getDeadLetterQueueName(queueName));

    await deadLetterQueue.add(
      job.name,
      {
        ...job.data,
        sourceQueue: queueName,
        sourceJobId: String(job.id ?? ""),
        failedReason: job.failedReason ?? null,
        movedAt: new Date().toISOString()
      },
      {
        jobId: `dlq-${String(job.id ?? jobId)}`,
        removeOnComplete: false,
        removeOnFail: false
      }
    );

    await job.remove();

    return {
      id: jobId,
      deadLetterQueue: deadLetterQueue.name,
      moved: true
    };
  }

  private getMonitoredQueue(queueName: string) {
    const queue = this.queues.find((item) => item.name === queueName);
    if (!queue) {
      throw new AppError("Queue not found", 404, "QUEUE_NOT_FOUND");
    }

    return queue;
  }

  private getDeadLetterQueueName(queueName: string) {
    return `${queueName}${JOB_MONITORING.deadLetterQueueSuffix}`;
  }

  private async getFailedJobOrThrow(client: Queue<BaseJobPayload>, jobId: string) {
    const job = await client.getJob(jobId);
    if (!job) {
      throw new AppError("Job not found", 404, "JOB_NOT_FOUND");
    }

    const state = await job.getState();
    if (state !== "failed") {
      throw new AppError("Only failed jobs can be updated", 409, "JOB_NOT_FAILED");
    }

    return job;
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

  private computeFailureRate(counts: Record<QueueCountKey, number>) {
    const finished = counts.completed + counts.failed;
    if (finished === 0) {
      return 0;
    }

    return Math.round((counts.failed / finished) * 100);
  }
}
