import { z } from "zod";
import type { I18nKey } from "../i18n";

type Translate = (key: I18nKey) => string;

function emailSchema(t: Translate) {
  return z
    .string()
    .trim()
    .min(1, t("validation.emailRequired"))
    .email(t("validation.emailInvalid"))
    .max(320, t("validation.emailTooLong"));
}

export function createLoginFormSchema(t: Translate) {
  return z.object({
    email: emailSchema(t),
    password: z.string().min(1, t("validation.passwordRequired")).max(72, t("validation.passwordTooLong"))
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>;

export function createPasswordSchema(t: Translate) {
  return z
    .string()
    .min(8, t("validation.passwordMin"))
    .max(72, t("validation.passwordTooLong"))
    .regex(/[A-Za-z]/, t("validation.passwordLetter"))
    .regex(/\d/, t("validation.passwordNumber"));
}

export function createRegisterFormSchema(t: Translate) {
  return z
    .object({
      email: emailSchema(t),
      password: createPasswordSchema(t),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")).max(72, t("validation.passwordTooLong"))
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("validation.passwordsMismatch")
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterFormSchema>>;

export function createForgotPasswordFormSchema(t: Translate) {
  return z.object({
    email: emailSchema(t)
  });
}

export type ForgotPasswordFormValues = z.infer<ReturnType<typeof createForgotPasswordFormSchema>>;

export function createPasswordUpdateFormSchema(t: Translate) {
  return z
    .object({
      password: createPasswordSchema(t),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")).max(72, t("validation.passwordTooLong"))
    })
    .refine((values) => values.password === values.confirmPassword, {
      path: ["confirmPassword"],
      message: t("validation.passwordsMismatch")
    });
}

export type PasswordUpdateFormValues = z.infer<ReturnType<typeof createPasswordUpdateFormSchema>>;
