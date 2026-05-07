import { z } from "zod";

export const createAuthSessionSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    role: z.enum(["USER", "ADMIN"]).optional()
  })
});
