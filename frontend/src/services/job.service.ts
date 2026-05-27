import { httpClient } from "../lib/http-client";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type JobQueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

export type JobQueueJob = {
  id: string;
  name: string;
  attemptsMade: number;
  timestamp: string | null;
  failedReason: string | null;
};

export type JobQueueSummary = {
  name: string;
  label: string;
  counts: JobQueueCounts;
  failedJobs: JobQueueJob[];
  waitingJobs: JobQueueJob[];
};

export type JobQueuesResponse = {
  items: JobQueueSummary[];
};

export const jobService = {
  async getQueues(): Promise<JobQueuesResponse> {
    const response = await httpClient.get<ApiResponse<JobQueuesResponse>>("/jobs/queues");
    return response.data.data;
  }
};
