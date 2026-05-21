import { z } from "zod";

export const listAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    action: z.string().trim().max(100).optional(),
    entityType: z.string().trim().max(100).optional()
  })
});
