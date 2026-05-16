import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { getLocalizedErrorMessage, useI18n } from "../i18n";
import { ForgotPasswordFormValues, createForgotPasswordFormSchema } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(createForgotPasswordFormSchema(t)),
    defaultValues: {
      email: ""
    }
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setErrorMessage(null);
    setIsSent(false);

    try {
      await authService.requestPasswordReset(values.email);
      setIsSent(true);
      form.reset();
    } catch (error: unknown) {
      setErrorMessage(getLocalizedErrorMessage(error, "auth.resetRequestFallbackError", t));
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow.forgotPassword")}
      title={t("auth.title.forgotPassword")}
      description={t("auth.description.forgotPassword")}
      footer={
        <Link className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline" to="/login">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      {isSent ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm" role="status">
            <p className="font-semibold">{t("auth.forgot.successTitle")}</p>
            <p className="mt-1 text-muted-foreground">{t("auth.forgot.successBody")}</p>
          </div>
          <Button className="h-12 w-full rounded-2xl text-base font-semibold shadow-sm" type="button" onClick={() => navigate("/login", { replace: true })}>
            {t("auth.footer.signIn")}
          </Button>
        </div>
      ) : null}

      {!isSent ? (
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField id="forgot-email" label={t("auth.emailLabel")} error={form.formState.errors.email?.message}>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
              {...form.register("email")}
            />
          </FormField>

          {errorMessage ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <Button className="mt-1 h-12 rounded-2xl text-base font-semibold shadow-sm" disabled={form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? t("auth.submit.sendingReset") : t("auth.submit.sendReset")}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}
