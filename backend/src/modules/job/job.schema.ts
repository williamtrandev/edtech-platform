import { z } from "zod";

export const listJobQueuesSchema = z.object({
  query: z.object({
    includeSamples: z.coerce.boolean().default(true)
  })
});

export const retryFailedJobSchema = z.object({
  params: z.object({
    queueName: z.string().trim().min(1).max(100),
    jobId: z.string().trim().min(1).max(100)
  })
});
