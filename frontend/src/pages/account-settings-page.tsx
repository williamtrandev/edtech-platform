import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "../components/app-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../features/auth/auth-context";
import { useCurrentUser } from "../features/user/hooks/use-current-user";
import { getLocalizedErrorMessage, type I18nKey, useI18n } from "../i18n";
import { PasswordUpdateFormValues, createPasswordUpdateFormSchema } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";

export function AccountSettingsPage() {
  const { isAuthenticated, isBootstrapping, userEmail } = useAuth();
  const currentUser = useCurrentUser(isAuthenticated && !isBootstrapping);
  const { t } = useI18n();
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(createPasswordUpdateFormSchema(t)),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const role = currentUser.data?.role;
  const roleLabel = role ? t(`role.${role}` as I18nKey) : "—";

  const onPasswordSubmit = async (values: PasswordUpdateFormValues) => {
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await authService.updatePassword(values.password);
      passwordForm.reset();
      setPasswordMessage(t("settings.passwordSuccess"));
    } catch (error: unknown) {
      setPasswordError(getLocalizedErrorMessage(error, "auth.resetFallbackError", t));
    }
  };

  return (
    <AppShell title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.profileTitle")}</CardTitle>
            <CardDescription>{t("settings.profileDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("settings.emailLabel")}</p>
              <p className="mt-1 truncate text-sm font-medium text-foreground">{currentUser.data?.email ?? userEmail ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("settings.roleLabel")}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{currentUser.isLoading ? t("common.loading") : roleLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.passwordTitle")}</CardTitle>
            <CardDescription>{t("settings.passwordDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate>
              <FormField
                id="settings-password"
                label={t("auth.newPasswordLabel")}
                error={passwordForm.formState.errors.password?.message}
                hint={t("auth.passwordHint")}
              >
                <Input
                  id="settings-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("auth.newPasswordPlaceholder")}
                  className="h-11 rounded-xl shadow-sm"
                  {...passwordForm.register("password")}
                />
              </FormField>

              <FormField
                id="settings-confirm-password"
                label={t("auth.confirmPasswordLabel")}
                error={passwordForm.formState.errors.confirmPassword?.message}
              >
                <Input
                  id="settings-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  className="h-11 rounded-xl shadow-sm"
                  {...passwordForm.register("confirmPassword")}
                />
              </FormField>

              {passwordMessage ? (
                <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground" role="status">
                  {passwordMessage}
                </div>
              ) : null}
              {passwordError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {passwordError}
                </div>
              ) : null}

              <Button className="h-11 w-full rounded-xl text-base font-medium shadow-sm sm:w-fit" disabled={passwordForm.formState.isSubmitting} type="submit">
                {passwordForm.formState.isSubmitting ? t("auth.submit.resettingPassword") : t("auth.submit.resetPassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}
