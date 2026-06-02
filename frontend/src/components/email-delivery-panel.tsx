import { AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "./skeleton";
import { useEmailDelivery } from "../hooks/use-jobs";
import { useI18n } from "../i18n";
import type { EmailDeliveryStatus } from "../services/job.service";

function providerLabel(status: EmailDeliveryStatus, t: ReturnType<typeof useI18n>["t"]) {
  if (status.configuredProvider === "SMTP") {
    return t("jobs.emailDelivery.providerSmtp");
  }
  if (status.configuredProvider === "RESEND") {
    return t("jobs.emailDelivery.providerResend");
  }
  return t("jobs.emailDelivery.providerLog");
}

export function EmailDeliveryPanel() {
  const { t } = useI18n();
  const { data, isLoading, isError } = useEmailDelivery();

  if (isLoading) {
    return (
      <Card className="rounded-lg border-border/70 shadow-none">
        <CardHeader className="border-b border-border/70 pb-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return null;
  }

  const mismatch = data.requestedProvider !== data.configuredProvider;
  const StatusIcon = data.deliversEmail && !mismatch ? CheckCircle2 : AlertTriangle;
  const statusVariant = data.deliversEmail && !mismatch ? "outline" : "destructive";

  return (
    <Card className="rounded-lg border-border/70 shadow-none">
      <CardHeader className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {t("jobs.emailDelivery.title")}
          </CardTitle>
          <CardDescription className="mt-1">{t("jobs.emailDelivery.description")}</CardDescription>
        </div>
        <Badge variant={statusVariant} className="h-7 shrink-0 rounded-md px-2.5">
          <StatusIcon className="size-3.5" aria-hidden />
          {providerLabel(data, t)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pt-4 text-sm">
        <dl className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{t("jobs.emailDelivery.from")}</dt>
            <dd className="mt-1 font-medium text-foreground">{data.emailFrom}</dd>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{t("jobs.emailDelivery.appUrl")}</dt>
            <dd className="mt-1 truncate font-medium text-foreground">{data.appPublicUrl}</dd>
          </div>
        </dl>
        {data.smtp ? (
          <p className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-muted-foreground">
            {t("jobs.emailDelivery.smtpHost")
              .replace("{host}", data.smtp.host)
              .replace("{port}", String(data.smtp.port))
              .replace("{secure}", data.smtp.secure ? t("jobs.emailDelivery.yes") : t("jobs.emailDelivery.no"))}
            {data.smtp.hasCredentials
              ? ` ${t("jobs.emailDelivery.smtpAuthConfigured")}`
              : ` ${t("jobs.emailDelivery.smtpAuthMissing")}`}
          </p>
        ) : null}
        {!data.deliversEmail ? (
          <p className="text-muted-foreground">{t("jobs.emailDelivery.logOnlyHint")}</p>
        ) : null}
        {mismatch ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
            {t("jobs.emailDelivery.providerMismatch")
              .replace("{requested}", data.requestedProvider)
              .replace("{active}", data.configuredProvider)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
