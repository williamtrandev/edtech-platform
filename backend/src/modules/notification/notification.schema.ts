import { z } from "zod";

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    unreadOnly: z.coerce.boolean().default(false)
  })
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

const notificationPreferencesBodySchema = z
  .object({
    inAppEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    enrollmentSuccess: z.boolean().optional(),
    assignmentGraded: z.boolean().optional(),
    certificateIssued: z.boolean().optional(),
    coursePublished: z.boolean().optional(),
    system: z.boolean().optional()
  })
  .strict();

export const updateNotificationPreferencesSchema = z.object({
  body: notificationPreferencesBodySchema
});

export type UpdateNotificationPreferencesInput = z.infer<typeof notificationPreferencesBodySchema>;
