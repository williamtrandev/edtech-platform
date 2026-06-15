import { z } from "zod";

export const listCourseCertificatesSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["ACTIVE", "REVOKED"]).optional()
  })
});

export const certificateIdParamSchema = z.object({
  params: z.object({
    certificateId: z.string().min(1)
  })
});

export const certificateSearchSuggestionsSchema = z.object({
  query: z.object({
    q: z.string().trim().min(1).max(120),
    limit: z.coerce.number().int().min(1).max(20).default(8)
  })
});

export const certificateSearchEventSchema = z.object({
  body: z.object({
    term: z.string().trim().min(1).max(120)
  })
});
