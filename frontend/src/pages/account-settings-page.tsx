import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, CheckCircle2, GraduationCap, Mail, Megaphone, MonitorCheck, ShieldCheck, Trophy } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AppShell } from "../components/app-shell";
import { FormField } from "../components/form-field";
import { useAuth } from "../hooks/use-auth";
import { useCurrentUser } from "../hooks/use-current-user";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "../hooks/use-notifications";
import { getLocalizedErrorMessage, type I18nKey, useI18n } from "../i18n";
import { PasswordUpdateFormValues, createPasswordUpdateFormSchema } from "../schemas/auth.schema";
import { authService } from "../services/auth.service";
import type { UpdateNotificationPreferencesPayload } from "../services/notification.service";

type NotificationPreferenceKey = keyof UpdateNotificationPreferencesPayload;

type NotificationPreferenceRow = {
  key: NotificationPreferenceKey;
  titleKey: I18nKey;
  descriptionKey: I18nKey;
  icon: typeof Bell;
};

export function AccountSettingsPage() {
  const { isAuthenticated, isBootstrapping, userEmail } = useAuth();
  const currentUser = useCurrentUser(isAuthenticated && !isBootstrapping);
  const notificationPreferences = useNotificationPreferences(isAuthenticated && !isBootstrapping);
  const updateNotificationPreferences = useUpdateNotificationPreferences();
  const { t } = useI18n();
  const [passwordMessageKey, setPasswordMessageKey] = useState<I18nKey | null>(null);
  const [passwordError, setPasswordError] = useState<unknown>(null);

  const passwordForm = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(createPasswordUpdateFormSchema(t)),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });

  const role = currentUser.data?.role;
  const roleLabel = role ? t(`role.${role}` as I18nKey) : "—";
  const isSavingNotifications = updateNotificationPreferences.isPending;

  const onPasswordSubmit = async (values: PasswordUpdateFormValues) => {
    setPasswordMessageKey(null);
    setPasswordError(null);
    try {
      await authService.updatePassword(values.password);
      passwordForm.reset();
      setPasswordMessageKey("settings.passwordSuccess");
    } catch (error: unknown) {
      setPasswordError(error);
    }
  };

  const updatePreference = (key: NotificationPreferenceKey, checked: boolean) => {
    updateNotificationPreferences.mutate(
      { [key]: checked },
      {
        onSuccess: () => toast.success(t("settings.notificationsSaved")),
        onError: (error) => toast.error(getLocalizedErrorMessage(error, "settings.notificationsSaveFailed", t))
      }
    );
  };

  const deliveryRows: NotificationPreferenceRow[] = [
    {
      key: "inAppEnabled",
      titleKey: "settings.inAppEnabled",
      descriptionKey: "settings.inAppEnabledDescription",
      icon: MonitorCheck
    },
    {
      key: "emailEnabled",
      titleKey: "settings.emailEnabled",
      descriptionKey: "settings.emailEnabledDescription",
      icon: Mail
    }
  ];

  const eventRows: NotificationPreferenceRow[] = [
    {
      key: "enrollmentSuccess",
      titleKey: "settings.enrollmentSuccess",
      descriptionKey: "settings.enrollmentSuccessDescription",
      icon: GraduationCap
    },
    {
      key: "assignmentGraded",
      titleKey: "settings.assignmentGraded",
      descriptionKey: "settings.assignmentGradedDescription",
      icon: CheckCircle2
    },
    {
      key: "certificateIssued",
      titleKey: "settings.certificateIssued",
      descriptionKey: "settings.certificateIssuedDescription",
      icon: Trophy
    },
    {
      key: "coursePublished",
      titleKey: "settings.coursePublished",
      descriptionKey: "settings.coursePublishedDescription",
      icon: Megaphone
    },
    {
      key: "system",
      titleKey: "settings.systemNotifications",
      descriptionKey: "settings.systemNotificationsDescription",
      icon: ShieldCheck
    }
  ];

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

              {passwordMessageKey ? (
                <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm text-foreground" role="status">
                  {t(passwordMessageKey)}
                </div>
              ) : null}
              {passwordError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {getLocalizedErrorMessage(passwordError, "auth.resetFallbackError", t)}
                </div>
              ) : null}

              <Button className="h-11 w-full rounded-xl text-base font-medium shadow-sm sm:w-fit" disabled={passwordForm.formState.isSubmitting} type="submit">
                {passwordForm.formState.isSubmitting ? t("auth.submit.resettingPassword") : t("auth.submit.resetPassword")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle>{t("settings.notificationsTitle")}</CardTitle>
            <CardDescription>{t("settings.notificationsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            {notificationPreferences.isLoading ? (
              <div className="grid gap-3" aria-busy="true" aria-label={t("settings.notificationsTitle")}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : notificationPreferences.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                {t("settings.notificationsLoadFailed")}
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
                <section className="grid content-start gap-2" aria-labelledby="notification-delivery-title">
                  <div className="mb-1">
                    <h2 id="notification-delivery-title" className="text-sm font-semibold text-foreground">
                      {t("settings.notificationDeliveryTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("settings.notificationDeliveryDescription")}</p>
                  </div>
                  {deliveryRows.map((row) => (
                    <NotificationToggleRow
                      key={row.key}
                      row={row}
                      checked={Boolean(notificationPreferences.data?.[row.key])}
                      disabled={isSavingNotifications}
                      onChange={(checked) => updatePreference(row.key, checked)}
                      t={t}
                    />
                  ))}
                </section>

                <section className="grid gap-2" aria-labelledby="notification-events-title">
                  <div className="mb-1">
                    <h2 id="notification-events-title" className="text-sm font-semibold text-foreground">
                      {t("settings.notificationEventsTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("settings.notificationEventsDescription")}</p>
                  </div>
                  {eventRows.map((row) => (
                    <NotificationToggleRow
                      key={row.key}
                      row={row}
                      checked={Boolean(notificationPreferences.data?.[row.key])}
                      disabled={isSavingNotifications}
                      onChange={(checked) => updatePreference(row.key, checked)}
                      t={t}
                    />
                  ))}
                </section>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}

function NotificationToggleRow({
  row,
  checked,
  disabled,
  onChange,
  t
}: {
  row: NotificationPreferenceRow;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  t: (key: I18nKey) => string;
}) {
  const Icon = row.icon;
  const inputId = `notification-preference-${row.key}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 transition-colors hover:border-border hover:bg-muted/40",
        disabled && "cursor-wait opacity-70"
      )}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{t(row.titleKey)}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{t(row.descriptionKey)}</span>
      </span>
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 cursor-pointer rounded border-border text-primary accent-primary disabled:cursor-wait"
      />
    </label>
  );
}
