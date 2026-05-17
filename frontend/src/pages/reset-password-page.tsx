import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "../components/auth-shell";
import { FormField } from "../components/form-field";
import { SUPABASE_AUTH_EVENT } from "../constants/supabase-auth";
import { getLocalizedErrorMessage, useI18n } from "../i18n";
import { resolveRecoveryCallback } from "../lib/password-reset-callback";
import { supabase } from "../lib/supabase";
import { PasswordUpdateFormValues, createPasswordUpdateFormSchema } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

type ResetState = "checking" | "ready" | "missing" | "expired" | "error" | "updated";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [state, setState] = useState<ResetState>("checking");
  const [callbackDetail, setCallbackDetail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasCompletedReset = useRef(false);

  const form = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(createPasswordUpdateFormSchema(t)),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (
        session?.access_token &&
        (event === SUPABASE_AUTH_EVENT.passwordRecovery ||
          event === SUPABASE_AUTH_EVENT.signedIn ||
          event === SUPABASE_AUTH_EVENT.initialSession)
      ) {
        setState("ready");
      }

      if (event === SUPABASE_AUTH_EVENT.signedOut && !hasCompletedReset.current) {
        setState("missing");
      }
    });

    async function prepareResetSession() {
      const result = await resolveRecoveryCallback();
      if (!isMounted) {
        return;
      }

      setCallbackDetail(result.status === "expired" || result.status === "error" ? result.detail ?? null : null);
      setState(result.status);
    }

    void prepareResetSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (values: PasswordUpdateFormValues) => {
    setErrorMessage(null);

    if (state !== "ready") {
      setErrorMessage(t("auth.reset.invalidSession"));
      return;
    }

    try {
      await authService.updatePassword(values.password);
      form.reset();
      hasCompletedReset.current = true;
      setState("updated");
      await authService.signOut();
    } catch (error: unknown) {
      setErrorMessage(getLocalizedErrorMessage(error, "auth.resetFallbackError", t));
    }
  };

  const isReady = state === "ready";

  return (
    <AuthShell
      eyebrow={t("auth.eyebrow.resetPassword")}
      title={t("auth.title.resetPassword")}
      description={t("auth.description.resetPassword")}
      footer={
        <Link className="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline" to="/login">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      {state === "checking" ? (
        <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground" role="status">
          {t("common.loading")}
        </div>
      ) : null}

      {state === "expired" || state === "error" || state === "missing" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            <p className="font-semibold">
              {state === "expired" ? t("auth.reset.linkExpiredTitle") : t("auth.reset.callbackErrorTitle")}
            </p>
            <p className="mt-1 text-muted-foreground">
              {state === "missing" ? t("auth.reset.invalidSession") : t("auth.reset.callbackErrorBody")}
            </p>
            {callbackDetail ? <p className="mt-2 text-xs text-muted-foreground">{callbackDetail}</p> : null}
          </div>
          <Button className="h-12 w-full rounded-2xl text-base font-semibold shadow-sm" type="button" onClick={() => navigate("/forgot-password")}>
            {t("auth.reset.requestNewResetLink")}
          </Button>
        </div>
      ) : null}

      {state === "updated" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-foreground shadow-sm" role="status">
            <p className="font-semibold">{t("auth.reset.successTitle")}</p>
            <p className="mt-1 text-muted-foreground">{t("auth.reset.successBody")}</p>
          </div>
          <Button className="h-12 w-full rounded-2xl text-base font-semibold shadow-sm" type="button" onClick={() => navigate("/login", { replace: true })}>
            {t("auth.footer.signIn")}
          </Button>
        </div>
      ) : null}

      {isReady ? (
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FormField id="reset-password" label={t("auth.newPasswordLabel")} error={form.formState.errors.password?.message}>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.newPasswordPlaceholder")}
              className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
              disabled={!isReady || form.formState.isSubmitting}
              {...form.register("password")}
            />
          </FormField>

          <FormField id="reset-confirm" label={t("auth.confirmPasswordLabel")} error={form.formState.errors.confirmPassword?.message}>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder={t("auth.confirmPasswordPlaceholder")}
              className="h-12 rounded-2xl border-border/70 bg-background/80 px-4 shadow-sm"
              disabled={!isReady || form.formState.isSubmitting}
              {...form.register("confirmPassword")}
            />
          </FormField>

          {errorMessage ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <Button className="mt-1 h-12 rounded-2xl text-base font-semibold shadow-sm" disabled={!isReady || form.formState.isSubmitting} type="submit">
            {form.formState.isSubmitting ? t("auth.submit.resettingPassword") : t("auth.submit.resetPassword")}
          </Button>
        </form>
      ) : null}
    </AuthShell>
  );
}
