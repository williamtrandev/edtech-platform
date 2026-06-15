import { CreditCard, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMyCoursePayments } from "../hooks/use-course-payments";
import { useI18n } from "../i18n";
import { formatMoney } from "../lib/course-pricing";
import { toMediaUrl } from "../lib/media-url";
import { STUDIO_FORM_SHELL } from "../lib/studio-ui";

type MyCoursePurchasesPanelProps = {
  enabled?: boolean;
};

function formatPurchasedAt(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function MyCoursePurchasesPanel({ enabled = true }: MyCoursePurchasesPanelProps) {
  const { t, formatError } = useI18n();
  const purchasesQuery = useMyCoursePayments(1, 8, enabled);
  const items = purchasesQuery.data?.items ?? [];

  if (purchasesQuery.isLoading) {
    return (
      <section className="space-y-3" aria-labelledby="course-purchases-heading">
        <div className="h-6 w-44 animate-pulse rounded-md bg-muted/50" aria-hidden />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-muted/40" aria-hidden />
          ))}
        </div>
      </section>
    );
  }

  if (purchasesQuery.isError) {
    return (
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3" aria-live="polite">
        <p className="text-sm text-destructive">{formatError(purchasesQuery.error, "errors.unexpected")}</p>
      </section>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <section className={STUDIO_FORM_SHELL} aria-labelledby="course-purchases-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
            <CreditCard className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="course-purchases-heading" className="text-base font-semibold tracking-tight text-foreground">
              {t("payments.historyTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("payments.historyDescription")}</p>
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {items.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                {payment.course.coverImageUrl ? (
                  <img
                    src={toMediaUrl(payment.course.coverImageUrl)}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-muted-foreground">
                    <Layers3 className="size-4" aria-hidden />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{payment.course.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatPurchasedAt(payment.completedAt ?? payment.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="text-sm font-semibold text-foreground">
                {formatMoney(payment.amountCents, payment.currency)}
              </span>
              <Button asChild size="sm" variant="outline" className="h-9 rounded-lg shadow-none">
                <Link to={`/courses/${payment.courseId}`}>{t("payments.viewCourse")}</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
