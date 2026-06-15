import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Award, BookOpen, Download, FileSearch, Loader2, Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { CERTIFICATE_STATUS } from "../constants/business";
import { useCertificateSearchSuggestions, useMyCertificates } from "../hooks/use-certificates";
import { useI18n } from "../i18n";
import { getCourseLearnPath } from "../lib/course-learn-path";
import { downloadBlob } from "../lib/download-file";
import { cn } from "@/lib/utils";
import { certificateService, type Certificate } from "../services/certificate.service";

const CERTIFICATE_FILTER = {
  all: "ALL",
  active: CERTIFICATE_STATUS.active,
  revoked: CERTIFICATE_STATUS.revoked
} as const;

type CertificateFilter = (typeof CERTIFICATE_FILTER)[keyof typeof CERTIFICATE_FILTER];

const CERTIFICATE_SORT = {
  newest: "ISSUED_DESC",
  oldest: "ISSUED_ASC",
  titleAsc: "TITLE_ASC"
} as const;

type CertificateSort = (typeof CERTIFICATE_SORT)[keyof typeof CERTIFICATE_SORT];

type CertificateMiniFrameProps = {
  courseTitle: string;
  verificationCode: string;
  platformLabel: string;
  certificateLabel: string;
  verifiedLabel: string;
  isRevoked: boolean;
};

function CertificateMiniFrame({
  courseTitle,
  verificationCode,
  platformLabel,
  certificateLabel,
  verifiedLabel,
  isRevoked
}: CertificateMiniFrameProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br from-card via-card to-primary/5 p-4 ring-1 ring-foreground/10",
        isRevoked && "opacity-70 grayscale-[0.35]"
      )}
    >
      <div className="absolute inset-2 rounded-lg border border-primary/20" aria-hidden />
      <div className="relative flex min-h-[168px] flex-col items-center justify-between px-2 py-3 text-center">
        <div className="grid size-10 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <Award className="size-5 text-primary" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">{platformLabel}</p>
          <p className="text-xs font-medium text-muted-foreground">{certificateLabel}</p>
          <p className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground">{courseTitle}</p>
        </div>
        <p className="max-w-full truncate font-mono text-[10px] text-muted-foreground">{verificationCode}</p>
        <div className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <span className="text-[8px] font-bold uppercase tracking-wide text-primary">{verifiedLabel}</span>
        </div>
      </div>
    </div>
  );
}

type StatPillProps = {
  label: string;
  value: number;
  icon: ReactNode;
};

function StatPill({ label, value, icon }: StatPillProps) {
  return (
    <div className="flex min-w-[140px] flex-1 items-center gap-3 rounded-xl bg-card/80 px-4 py-3 ring-1 ring-foreground/10 backdrop-blur-sm">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">{icon}</div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type CertificateEarnedCardProps = {
  certificate: Certificate;
  platformLabel: string;
  certificateLabel: string;
  verifiedLabel: string;
  earnedBadgeLabel: string;
  issuedLabel: string;
  downloadLabel: string;
  downloadingLabel: string;
  courseLabel: string;
  statusLabel: string;
  isDownloading: boolean;
  onDownload: () => void;
};

function CertificateEarnedCard({
  certificate,
  platformLabel,
  certificateLabel,
  verifiedLabel,
  earnedBadgeLabel,
  issuedLabel,
  downloadLabel,
  downloadingLabel,
  courseLabel,
  statusLabel,
  isDownloading,
  onDownload
}: CertificateEarnedCardProps) {
  const isActive = certificate.status === CERTIFICATE_STATUS.active;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 transition-[transform,box-shadow] duration-300",
        "hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-28px_rgb(0_0_0/0.45)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none",
        "animate-in fade-in-0 slide-in-from-bottom-3 duration-500 motion-reduce:animate-none"
      )}
    >
      <div className="p-3 pb-0">
        <CertificateMiniFrame
          courseTitle={certificate.course.title}
          verificationCode={certificate.verificationCode}
          platformLabel={platformLabel}
          certificateLabel={certificateLabel}
          verifiedLabel={verifiedLabel}
          isRevoked={!isActive}
        />
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span className="text-xs font-medium text-muted-foreground">{earnedBadgeLabel}</span>
            </div>
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">{certificate.course.title}</p>
            <p className="text-xs text-muted-foreground">
              {issuedLabel} {new Date(certificate.issuedAt).toLocaleDateString()}
            </p>
          </div>
          <Badge variant={isActive ? "secondary" : "outline"} className="shrink-0 rounded-md">
            {statusLabel}
          </Badge>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 rounded-lg shadow-none"
            disabled={!isActive || isDownloading}
            onClick={onDownload}
          >
            {isDownloading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Download className="size-4" aria-hidden />}
            {isDownloading ? downloadingLabel : downloadLabel}
          </Button>
          <Button asChild size="sm" className="h-9 rounded-lg shadow-none">
            <Link to={getCourseLearnPath(certificate.courseId)}>
              <BookOpen className="size-4" aria-hidden />
              {courseLabel}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

function CertificateGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
          <div className="p-3 pb-0">
            <div className="min-h-[168px] animate-pulse rounded-xl bg-muted/50 motion-reduce:animate-none" />
          </div>
          <div className="space-y-3 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted/70 motion-reduce:animate-none" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-9 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
              <div className="h-9 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
              <div className="h-9 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MyCertificatesPage() {
  const { t, formatError } = useI18n();
  const certificatesQuery = useMyCertificates();
  const [status, setStatus] = useState<CertificateFilter>(CERTIFICATE_FILTER.all);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [sortBy, setSortBy] = useState<CertificateSort>(CERTIFICATE_SORT.newest);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [trackingTerm, setTrackingTerm] = useState<string | null>(null);
  const trackTimeoutRef = useRef<number | null>(null);

  const certificates = certificatesQuery.data ?? [];
  const normalizedKeyword = keyword.trim().toLowerCase();
  const searchSuggestionsQuery = useCertificateSearchSuggestions(debouncedKeyword, debouncedKeyword.trim().length >= 2);
  const suggestions = searchSuggestionsQuery.data ?? [];

  const stats = useMemo(() => {
    const activeCount = certificates.filter((item) => item.status === CERTIFICATE_STATUS.active).length;
    return {
      total: certificates.length,
      active: activeCount
    };
  }, [certificates]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 250);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [keyword]);

  const filteredCertificates = useMemo(() => {
    const byStatus =
      status === CERTIFICATE_FILTER.all ? certificates : certificates.filter((certificate) => certificate.status === status);
    const byKeyword = normalizedKeyword
      ? byStatus.filter((certificate) => {
          return (
            certificate.course.title.toLowerCase().includes(normalizedKeyword) ||
            certificate.verificationCode.toLowerCase().includes(normalizedKeyword)
          );
        })
      : byStatus;

    const sorted = [...byKeyword];
    sorted.sort((left, right) => {
      if (sortBy === CERTIFICATE_SORT.titleAsc) {
        return left.course.title.localeCompare(right.course.title);
      }

      const leftIssuedAt = new Date(left.issuedAt).getTime();
      const rightIssuedAt = new Date(right.issuedAt).getTime();
      if (sortBy === CERTIFICATE_SORT.oldest) {
        return leftIssuedAt - rightIssuedAt;
      }
      return rightIssuedAt - leftIssuedAt;
    });

    return sorted;
  }, [certificates, normalizedKeyword, sortBy, status]);

  const trackSearchTerm = (term: string) => {
    const normalizedTerm = term.trim();
    if (!normalizedTerm || trackingTerm === normalizedTerm) {
      return;
    }
    setTrackingTerm(normalizedTerm);
    void certificateService.trackCertificateSearch(normalizedTerm).catch(() => {
      // Ignore tracking failures to keep search UX responsive.
    });
  };

  const scheduleTrackSearch = (term: string) => {
    if (trackTimeoutRef.current) {
      window.clearTimeout(trackTimeoutRef.current);
    }
    trackTimeoutRef.current = window.setTimeout(() => {
      trackSearchTerm(term);
    }, 600);
  };

  useEffect(() => {
    return () => {
      if (trackTimeoutRef.current) {
        window.clearTimeout(trackTimeoutRef.current);
      }
    };
  }, []);

  const handleDownloadCertificate = async (certificateId: string) => {
    setDownloadingCertificateId(certificateId);
    try {
      const file = await certificateService.downloadCertificatePdf(certificateId);
      downloadBlob(file.blob, file.filename);
    } catch (error) {
      toast.error(formatError(error, "progress.certificateDownloadFailed"));
    } finally {
      setDownloadingCertificateId(null);
    }
  };

  return (
    <AppShell title={t("certificatesPage.title")} subtitle={t("certificatesPage.subtitle")}>
      <div className="overflow-x-hidden space-y-8">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-card to-card px-5 py-6 ring-1 ring-foreground/10 sm:px-6 md:py-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_100%_0%,var(--color-primary)/0.14,transparent_60%)]"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{t("certificatesPage.heroTitle")}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t("certificatesPage.heroDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <StatPill label={t("certificatesPage.statsTotal")} value={stats.total} icon={<Award className="size-5" aria-hidden />} />
              <StatPill label={t("certificatesPage.statsActive")} value={stats.active} icon={<ShieldCheck className="size-5" aria-hidden />} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-muted/25 p-4 ring-1 ring-foreground/10 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  scheduleTrackSearch(event.target.value);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsSearchFocused(false);
                  }, 120);
                }}
                placeholder={t("certificatesPage.searchPlaceholder")}
                className="h-11 rounded-xl border-0 bg-background pl-9 shadow-none ring-1 ring-foreground/10"
              />
              {isSearchFocused && suggestions.length ? (
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl bg-background p-1 shadow-lg ring-1 ring-foreground/10">
                  {suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.term}-${suggestion.score}`}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                      onMouseDown={() => {
                        setKeyword(suggestion.term);
                        setDebouncedKeyword(suggestion.term);
                        trackSearchTerm(suggestion.term);
                      }}
                    >
                      <span className="truncate">{suggestion.term}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {suggestion.score > 0 ? `${Math.round(suggestion.score)}` : t("certificatesPage.suggestionNew")}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as CertificateFilter);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl border-0 bg-background shadow-none ring-1 ring-foreground/10">
                <SelectValue placeholder={t("certificatesPage.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CERTIFICATE_FILTER.all}>{t("certificatesPage.statusAll")}</SelectItem>
                <SelectItem value={CERTIFICATE_FILTER.active}>{t("certificateStatus.ACTIVE")}</SelectItem>
                <SelectItem value={CERTIFICATE_FILTER.revoked}>{t("certificateStatus.REVOKED")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as CertificateSort);
              }}
            >
              <SelectTrigger className="h-11 rounded-xl border-0 bg-background shadow-none ring-1 ring-foreground/10">
                <SelectValue placeholder={t("certificatesPage.sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CERTIFICATE_SORT.newest}>{t("certificatesPage.sortNewest")}</SelectItem>
                <SelectItem value={CERTIFICATE_SORT.oldest}>{t("certificatesPage.sortOldest")}</SelectItem>
                <SelectItem value={CERTIFICATE_SORT.titleAsc}>{t("certificatesPage.sortCourseTitle")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!certificatesQuery.isLoading && !certificatesQuery.isError ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("certificatesPage.resultsCount").replace("{count}", String(filteredCertificates.length))}
            </p>
          ) : null}
        </section>

        {certificatesQuery.isLoading ? <CertificateGridSkeleton /> : null}

        {certificatesQuery.isError ? (
          <div className="rounded-2xl bg-destructive/5 px-5 py-4 text-sm text-destructive ring-1 ring-destructive/20">
            {t("progress.certificatesLoadFailed")}
          </div>
        ) : null}

        {!certificatesQuery.isLoading && !certificatesQuery.isError ? (
          filteredCertificates.length ? (
            <div className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCertificates.map((certificate) => (
                <CertificateEarnedCard
                  key={certificate.id}
                  certificate={certificate}
                  platformLabel={t("courseCompleted.platformLabel")}
                  certificateLabel={t("courseCompleted.certificateTitle")}
                  verifiedLabel={t("courseCompleted.verifiedSeal")}
                  earnedBadgeLabel={t("certificatesPage.earnedBadge")}
                  issuedLabel={t("progress.issued")}
                  downloadLabel={t("progress.downloadCertificate")}
                  downloadingLabel={t("progress.downloadingCertificate")}
                  courseLabel={t("progress.course")}
                  statusLabel={t(`certificateStatus.${certificate.status}`)}
                  isDownloading={downloadingCertificateId === certificate.id}
                  onDownload={() => {
                    void handleDownloadCertificate(certificate.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileSearch}
              title={certificates.length ? t("certificatesPage.noResults") : t("progress.noCertificates")}
              description={certificates.length ? t("certificatesPage.noResultsDescription") : t("progress.noCertificatesDescription")}
            />
          )
        ) : null}
      </div>
    </AppShell>
  );
}
