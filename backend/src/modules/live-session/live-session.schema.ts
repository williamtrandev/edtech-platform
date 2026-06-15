import { z } from "zod";

export const listMyLiveSessionsSchema = z.object({
  query: z.object({
    status: z.enum(["UPCOMING", "LIVE", "ENDED", "UNSCHEDULED", "ALL"]).default("ALL"),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export const listCourseLiveSessionsSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});
