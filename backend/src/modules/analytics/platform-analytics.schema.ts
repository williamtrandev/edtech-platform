import { z } from "zod";

export const getPlatformAnalyticsSchema = z.object({
  query: z.object({}).strict()
});
