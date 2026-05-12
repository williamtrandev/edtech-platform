import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email").max(320, "Email is too long"),
  password: z.string().min(1, "Password is required").max(72, "Password is too long")
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

const registerPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export const registerFormSchema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Please enter a valid email").max(320, "Email is too long"),
    password: registerPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your password").max(72, "Password is too long")
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match"
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
