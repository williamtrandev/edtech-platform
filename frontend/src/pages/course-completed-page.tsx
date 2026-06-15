import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Award, ArrowLeft, BookOpen, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { useCourseDetail } from "../hooks/use-courses";
import { useMyCertificates } from "../hooks/use-certificates";
import { useI18n } from "../i18n";
import { downloadBlob } from "../lib/download-file";
import { getCourseReviewLearnPath } from "../lib/course-learn-path";
import { cn } from "@/lib/utils";
import { certificateService } from "../services/certificate.service";

type CompletionLocationState = {
  certificateId?: string | null;
  verificationCode?: string | null;
};

type CertificatePreviewProps = {
  courseTitle: string;
  verificationCode?: string;
  isGenerating: boolean;
  generatingLabel: string;
  certificateLabel: string;
  platformLabel: string;
  verifiedLabel: string;
};

function CertificatePreview({
  courseTitle,
  verificationCode,
  isGenerating,
  generatingLabel,
  certificateLabel,
  platformLabel,
  verifiedLabel
}: CertificatePreviewProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md",
        "animate-in fade-in-0 slide-in-from-bottom-4 duration-700 motion-reduce:animate-none"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-primary/15 blur-3xl dark:bg-primary/25"
      />
      <article
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-card via-card to-primary/5",
          "shadow-[0_24px_80px_-24px_rgb(0_0_0/0.28)] ring-1 ring-foreground/10",
          "dark:shadow-[0_24px_80px_-24px_rgb(0_0_0/0.55)]"
        )}
      >
        <div className="absolute inset-3 rounded-xl border border-primary/25 dark:border-primary/35" />
        <div className="absolute inset-5 rounded-lg border border-primary/15" />

        <div className="relative flex h-full flex-col px-8 py-10 text-center">
          <div className="mx-auto mb-6 grid size-14 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <Award className="size-7 text-primary" aria-hidden />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{platformLabel}</p>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{certificateLabel}</h2>

          <div className="my-6 h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {isGenerating ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Loader2 className="size-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
              <p className="text-sm text-muted-foreground">{generatingLabel}</p>
              <div className="mt-2 h-2 w-3/4 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
              <div className="h-2 w-1/2 animate-pulse rounded-full bg-muted/70 motion-reduce:animate-none" />
            </div>
          ) : (
            <>
              <p className="line-clamp-3 text-2xl font-semibold leading-tight tracking-tight text-foreground">{courseTitle}</p>
              {verificationCode ? (
                <p className="mt-auto break-all font-mono text-[10px] leading-relaxed text-muted-foreground">{verificationCode}</p>
              ) : null}
            </>
          )}

          <div className="absolute bottom-8 right-8 grid size-16 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/25">
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">{verifiedLabel}</span>
          </div>
        </div>
      </article>
    </div>
  );
}

type ActionTileProps = {
  href: string;
  icon: ReactNode;
  label: string;
  description: string;
  disabled?: boolean;
  onClick?: () => void;
};

function ActionTile({ href, icon, label, description, disabled, onClick }: ActionTileProps) {
  const className = cn(
    "group flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-[transform,background-color,box-shadow] duration-300",
    "hover:bg-accent/30 hover:shadow-[0_12px_40px_-20px_rgb(0_0_0/0.35)] active:scale-[0.98]",
    "motion-reduce:transition-none motion-reduce:hover:shadow-none",
    disabled && "pointer-events-none opacity-60"
  );

  const content = (
    <>
      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100">
          {icon}
        </div>
      <div>
        <p className="font-semibold tracking-tight text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link to={href} className={className}>
      {content}
    </Link>
  );
}

export function CourseCompletedPage() {
  const { courseId = "" } = useParams();
  const location = useLocation();
  const state = (location.state as CompletionLocationState | null) ?? null;
  const { t, formatError } = useI18n();
  const courseQuery = useCourseDetail(courseId);
  const certificatesQuery = useMyCertificates();
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);

  const certificate = useMemo(() => {
    return (
      certificatesQuery.data?.find((item) => item.courseId === courseId) ??
      (state?.certificateId && state?.verificationCode
        ? {
            id: state.certificateId,
            verificationCode: state.verificationCode
          }
        : null)
    );
  }, [certificatesQuery.data, courseId, state?.certificateId, state?.verificationCode]);

  useEffect(() => {
    if (!courseId || certificate) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void certificatesQuery.refetch();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [certificate, certificatesQuery, courseId]);

  const handleDownloadCertificate = async () => {
    if (!certificate?.id) {
      return;
    }

    setDownloadingCertificateId(certificate.id);
    try {
      const file = await certificateService.downloadCertificatePdf(certificate.id);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast.error(formatError(error, "progress.certificateDownloadFailed"));
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  if (!courseId) {
    return <Navigate to="/dashboard" replace />;
  }

  const courseTitle = courseQuery.data?.title ?? t("courseCompleted.subtitleFallback");
  const isDownloading = Boolean(certificate?.id && downloadingCertificateId === certificate.id);
  const subtitle = courseQuery.data
    ? t("courseCompleted.subtitle").replace("{course}", courseQuery.data.title)
    : t("courseCompleted.subtitleFallback");

  return (
    <AppShell immersive title={t("courseCompleted.title")} subtitle={subtitle}>
      <div className="overflow-x-hidden">
        <section className="relative isolate min-h-[min(100dvh,920px)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--color-primary)/0.18,transparent_70%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />

          <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 lg:px-8 lg:py-16">
            <div
              className={cn(
                "flex flex-col gap-6 lg:pr-4",
                "animate-in fade-in-0 slide-in-from-left-4 duration-700 motion-reduce:animate-none"
              )}
            >
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-xs font-medium">
                <Sparkles className="mr-1.5 size-3.5" aria-hidden />
                {t("courseCompleted.milestoneBadge")}
              </Badge>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                  {t("courseCompleted.congratsTitle")}
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t("courseCompleted.congratsDescription")}</p>
                <p className="max-w-xl text-sm font-medium text-foreground/80">{subtitle}</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild size="lg" className="h-11 rounded-xl px-6 shadow-none active:scale-[0.98]">
                  <Link to="/dashboard">
                    <ArrowLeft className="size-4" aria-hidden />
                    {t("courseCompleted.backToLearning")}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-11 rounded-xl px-6 shadow-none active:scale-[0.98]">
                  <Link to={getCourseReviewLearnPath(courseId)}>
                    <BookOpen className="size-4" aria-hidden />
                    {t("courseCompleted.reviewCourse")}
                  </Link>
                </Button>
              </div>
            </div>

            <CertificatePreview
              courseTitle={courseTitle}
              verificationCode={certificate?.verificationCode}
              isGenerating={!certificate}
              generatingLabel={t("courseCompleted.generatingCertificate")}
              certificateLabel={t("courseCompleted.certificateTitle")}
              platformLabel={t("courseCompleted.platformLabel")}
              verifiedLabel={t("courseCompleted.verifiedSeal")}
            />
          </div>
        </section>

        <section className="border-t border-border/60 bg-muted/20 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px]">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("courseCompleted.nextStepsTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("courseCompleted.nextStepsDescription")}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {certificate ? (
                <ActionTile
                  href="#"
                  icon={
                    isDownloading ? (
                      <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
                    ) : (
                      <Download className="size-5" aria-hidden />
                    )
                  }
                  label={isDownloading ? t("progress.downloadingCertificate") : t("courseCompleted.downloadCertificate")}
                  description={t("courseCompleted.downloadCertificateHint")}
                  disabled={isDownloading}
                  onClick={() => {
                    void handleDownloadCertificate();
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
                      <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
                    </div>
                    <div>
                      <p className="font-semibold tracking-tight text-foreground">{t("courseCompleted.generatingCertificate")}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t("courseCompleted.generatingCertificateHint")}</p>
                    </div>
                  </div>
                </div>
              )}

              <ActionTile
                href="/my-certificates"
                icon={<Award className="size-5" aria-hidden />}
                label={t("courseCompleted.openCertificates")}
                description={t("courseCompleted.openCertificatesHint")}
              />
              <ActionTile
                href="/my-progress"
                icon={<BookOpen className="size-5" aria-hidden />}
                label={t("courseCompleted.openProgress")}
                description={t("courseCompleted.openProgressHint")}
              />
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
