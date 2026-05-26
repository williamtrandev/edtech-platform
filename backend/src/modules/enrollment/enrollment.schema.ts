import { z } from "zod";

export const createEnrollmentSchema = z.object({
  body: z.object({
    courseId: z.string().min(1)
  })
});

export const dropEnrollmentSchema = z.object({
  params: z.object({
    enrollmentId: z.string().min(1)
  })
});

export const adminEnrollCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    email: z.string().trim().email().max(320)
  })
});

export const adminRemoveCourseEnrollmentSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    userId: z.string().min(1)
  })
});
