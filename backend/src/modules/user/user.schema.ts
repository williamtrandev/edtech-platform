import { z } from "zod";

const userRoleSchema = z.enum(["USER", "INSTRUCTOR", "ADMIN"]);
const userStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

export const createUserSchema = z.object({
  body: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    role: userRoleSchema.optional().default("USER")
  })
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional()
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    email: z.string().email().optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional()
  })
});
