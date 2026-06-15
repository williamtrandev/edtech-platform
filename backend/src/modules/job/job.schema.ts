import { z } from "zod";

export const listJobQueuesSchema = z.object({
  query: z.object({
    includeSamples: z.coerce.boolean().default(true)
  })
});

export const queueNameParamSchema = z.object({
  params: z.object({
    queueName: z.string().trim().min(1).max(100)
  })
});

export const retryFailedJobSchema = z.object({
  params: z.object({
    queueName: z.string().trim().min(1).max(100),
    jobId: z.string().trim().min(1).max(100)
  })
});

export const listFailedJobsSchema = z.object({
  params: z.object({
    queueName: z.string().trim().min(1).max(100)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
  })
});

export const retryAllFailedJobsSchema = z.object({
  params: z.object({
    queueName: z.string().trim().min(1).max(100)
  }),
  body: z
    .object({
      limit: z.number().int().min(1).max(25).optional()
    })
    .default({})
});
