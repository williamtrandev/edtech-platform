import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../features/auth/auth-context";
import { getLocalizedErrorMessage, useI18n } from "../i18n";
import { RegisterFormValues, createRegisterFormSchema } from "../schemas/auth.schema";

export function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { t } = useI18n();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<{ title: string; body: string } | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(createRegisterFormSchema(t)),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await signUp(values.email, values.password);

      if (result.hasSession) {
        navigate("/", { replace: true });
        return;
      }

      if (result.needsEmailConfirmation) {
        setSuccessMessage({
          title: t("auth.signup.confirmTitle"),
          body: t("auth.signup.confirmBody")
        });
        form.reset();
        return;
      }

      setSuccessMessage({
        title: t("auth.signup.readyTitle"),
        body: t("auth.signup.readyBody")
      });
      form.reset();
    } catch (error: unknown) {
      setErrorMessage(getLocalizedErrorMessage(error, "auth.registerFallbackError", t));
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
      {successMessage ? (
        <div className="mb-5 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm" role="status">
          <p className="font-semibold">{successMessage.title}</p>
          <p className="mt-1 text-muted-foreground">{successMessage.body}</p>
        </div>
      ) : null}
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
