import { z } from "zod";

export const listJobQueuesSchema = z.object({
  query: z.object({
    includeSamples: z.coerce.boolean().default(true)
  })
});
