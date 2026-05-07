import { z } from "zod";

export const createUserFormSchema = z.object({
  id: z.string().min(1, "ID is required"),
  email: z.string().email("Invalid email"),
  role: z.enum(["USER", "ADMIN"])
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;
