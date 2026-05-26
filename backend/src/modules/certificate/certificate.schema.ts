import { z } from "zod";

export const certificateVerificationSchema = z.object({
  params: z.object({
    verificationCode: z.string().trim().min(6).max(80)
  })
});

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
