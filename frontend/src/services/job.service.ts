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
  failureRate: number;
  failedJobs: JobQueueJob[];
  waitingJobs: JobQueueJob[];
};

export type JobQueuesResponse = {
  items: JobQueueSummary[];
};

export type EmailDeliveryStatus = {
  configuredProvider: "LOG" | "SMTP" | "RESEND";
  requestedProvider: "LOG" | "SMTP" | "RESEND";
  deliversEmail: boolean;
  emailFrom: string;
  appPublicUrl: string;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    hasCredentials: boolean;
  } | null;
  resend: {
    configured: boolean;
  };
};

export type FailedJobsResponse = {
  items: JobQueueJob[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type RetryAllFailedJobsResponse = {
  retriedCount: number;
  jobIds: string[];
};

export const jobService = {
  async getEmailDelivery(): Promise<EmailDeliveryStatus> {
    const response = await httpClient.get<ApiResponse<EmailDeliveryStatus>>("/jobs/email-delivery");
    return response.data.data;
  },

  async getQueues(): Promise<JobQueuesResponse> {
    const response = await httpClient.get<ApiResponse<JobQueuesResponse>>("/jobs/queues");
    return response.data.data;
  },

  async listFailedJobs(queueName: string, page: number, limit = 20): Promise<FailedJobsResponse> {
    const response = await httpClient.get<ApiResponse<FailedJobsResponse>>(
      `/jobs/queues/${encodeURIComponent(queueName)}/failed-jobs`,
      { params: { page, limit } }
    );
    return response.data.data;
  },

  async retryFailedJob(queueName: string, jobId: string): Promise<JobQueueJob> {
    const response = await httpClient.post<ApiResponse<JobQueueJob>>(
      `/jobs/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}/retries`
    );
    return response.data.data;
  },

  async retryAllFailedJobs(queueName: string, limit?: number): Promise<RetryAllFailedJobsResponse> {
    const response = await httpClient.post<ApiResponse<RetryAllFailedJobsResponse>>(
      `/jobs/queues/${encodeURIComponent(queueName)}/failed-jobs/retries`,
      { limit }
    );
    return response.data.data;
  },

  async discardFailedJob(queueName: string, jobId: string): Promise<{ id: string; removed: boolean }> {
    const response = await httpClient.delete<ApiResponse<{ id: string; removed: boolean }>>(
      `/jobs/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}`
    );
    return response.data.data;
  },

  async moveFailedJobToDeadLetter(
    queueName: string,
    jobId: string
  ): Promise<{ id: string; deadLetterQueue: string; moved: boolean }> {
    const response = await httpClient.post<
      ApiResponse<{ id: string; deadLetterQueue: string; moved: boolean }>
    >(`/jobs/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}/dead-letter`);
    return response.data.data;
  }
};
