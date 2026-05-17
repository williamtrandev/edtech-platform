import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../features/auth/auth-context";
import { getLocalizedErrorMessage, useI18n } from "../i18n";
import { LoginFormValues, createLoginFormSchema } from "../schemas/auth.schema";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { signIn } = useAuth();
  const { t } = useI18n();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ title: string; body: string } | null>(null);
  const consumedRegisterQuery = useRef(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(createLoginFormSchema(t)),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  useEffect(() => {
    if (consumedRegisterQuery.current) {
      return;
    }

    const confirmed = searchParams.get("confirmed") === "1";
    if (confirmed) {
      consumedRegisterQuery.current = true;
      navigate("/email-confirmed", { replace: true });
      return;
    }

    if (!confirmed && searchParams.get("registered") !== "1") {
      return;
    }

    consumedRegisterQuery.current = true;
    const needsVerify = searchParams.get("verify") === "1";

    if (needsVerify) {
      const title = t("auth.signup.confirmTitle");
      const body = t("auth.signup.confirmBody");
      setBanner({ title, body });
    } else {
      const title = t("auth.signup.readyTitle");
      const body = t("auth.signup.readyBody");
      setBanner({ title, body });
    }

    const next = new URLSearchParams(searchParams);
    next.delete("registered");
    next.delete("verify");
    next.delete("confirmed");
    setSearchParams(next, { replace: true });
  }, [navigate, searchParams, setSearchParams, t]);

  const onSubmit = async (values: LoginFormValues) => {
    setErrorMessage(null);
    try {
      await signIn(values.email, values.password);
      navigate("/", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(getLocalizedErrorMessage(error, "auth.loginFallbackError", t));
    }
  };

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow.signIn")}
      title={t("auth.title.signIn")}
      description={t("auth.description.signIn")}
      footer={
        <p>
          {t("auth.footer.noAccount")}{" "}
          <Link className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline" to="/register">
            {t("auth.footer.createAccount")}
          </Link>
        </p>
      }
    >
      {banner ? (
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm mb-5">
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-1 text-muted-foreground">{banner.body}</p>
        </div>
      ) : null}

      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField id="login-email" label={t("auth.emailLabel")} error={form.formState.errors.email?.message}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
            {...form.register("email")}
          />
        </FormField>

        <FormField id="login-password" label={t("auth.passwordLabel")} error={form.formState.errors.password?.message}>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={t("auth.passwordMaskedPlaceholder")}
            className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
            {...form.register("password")}
          />
        </FormField>

        <div className="-mt-2 flex justify-end">
          <Link className="cursor-pointer text-sm font-medium text-foreground underline-offset-4 hover:underline" to="/forgot-password">
            {t("auth.forgotPasswordLink")}
          </Link>
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <Button className="mt-1 h-12 rounded-2xl text-base font-semibold shadow-sm" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? t("auth.submit.signingIn") : t("auth.submit.signIn")}
        </Button>
      </form>
    </AuthShell>
  );
}
