import { z } from "zod";

export const getPlatformAnalyticsSchema = z.object({
  query: z
    .object({
      forceRefresh: z.coerce.boolean().default(false)
    })
    .strict()
});
