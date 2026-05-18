import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, GraduationCap } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { USER_ROLE } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import { getLocalizedErrorMessage, useI18n } from "../i18n";
import { RegisterFormValues, createRegisterFormSchema } from "../schemas/auth.schema";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp, signOut } = useAuth();
  const { t } = useI18n();
  const [authError, setAuthError] = useState<unknown>(null);
  const errorMessage = authError ? getLocalizedErrorMessage(authError, "auth.registerFallbackError", t) : null;

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterFormSchema(t)),
    defaultValues: {
      email: "",
      role: USER_ROLE.user,
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setAuthError(null);
    try {
      const result = await signUp(values.email, values.password, values.role);

      if (result.hasSession) {
        await signOut();
        navigate("/login?registered=1", { replace: true });
        return;
      }

      if (result.needsEmailConfirmation) {
        navigate("/login?registered=1&verify=1", { replace: true });
        return;
      }

      navigate("/login?registered=1", { replace: true });
    } catch (error: unknown) {
      setAuthError(error);
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow.register")}
      title={t("auth.title.register")}
      description={t("auth.description.register")}
      footer={
        <p>
          {t("auth.footer.hasAccount")}{" "}
          <Link className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline" to="/login">
            {t("auth.footer.signIn")}
          </Link>
        </p>
      }
    >
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField id="register-email" label={t("auth.emailLabel")} error={form.formState.errors.email?.message}>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
            {...form.register("email")}
          />
        </FormField>

        <FormField id="register-role" label={t("auth.roleLabel")} error={form.formState.errors.role?.message}>
          <div id="register-role" className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("auth.roleLabel")}>
            {[
              {
                value: USER_ROLE.user,
                icon: BookOpen,
                title: t("auth.roleLearnerTitle"),
                description: t("auth.roleLearnerDescription")
              },
              {
                value: USER_ROLE.instructor,
                icon: GraduationCap,
                title: t("auth.roleInstructorTitle"),
                description: t("auth.roleInstructorDescription")
              }
            ].map((option) => {
              const Icon = option.icon;
              const active = form.watch("role") === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                    active ? "border-foreground bg-foreground text-background" : "border-border/70 bg-background/80 hover:bg-muted/50"
                  )}
                  onClick={() => form.setValue("role", option.value, { shouldDirty: true, shouldValidate: true })}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-background" : "text-muted-foreground")} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className={cn("mt-1 block text-xs leading-5", active ? "text-background/75" : "text-muted-foreground")}>{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </FormField>

        <FormField
          id="register-password"
          label={t("auth.passwordLabel")}
          error={form.formState.errors.password?.message}
          hint={t("auth.passwordHint")}
        >
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.newPasswordPlaceholder")}
            className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
            {...form.register("password")}
          />
        </FormField>

        <FormField id="register-confirm" label={t("auth.confirmPasswordLabel")} error={form.formState.errors.confirmPassword?.message}>
          <Input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.confirmPasswordPlaceholder")}
            className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
            {...form.register("confirmPassword")}
          />
        </FormField>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <Button className="mt-1 h-12 rounded-2xl text-base font-semibold shadow-sm" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? t("auth.submit.registering") : t("auth.submit.register")}
        </Button>
      </form>
    </AuthShell>
  );
}
