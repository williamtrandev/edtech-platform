import { BellRing, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { MetricCardSkeleton, TableSkeleton } from "../components/skeleton";
import { usePlatformNotificationSummary, usePlatformNotifications } from "../hooks/use-platform-notifications";
import { useI18n, isI18nKey } from "../i18n";
import { NOTIFICATION_FILTER_TYPES } from "../lib/notification-types";
import type { NotificationType } from "../constants/business";

const ALL_VALUE = "all";
const UNREAD_VALUE = "unread";

export function NotificationManagementPage() {
  const { t, formatError } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState(ALL_VALUE);
  const [readStatus, setReadStatus] = useState(ALL_VALUE);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const summaryQuery = usePlatformNotificationSummary();
  const listQuery = usePlatformNotifications({
    search: debouncedSearch,
    type: type === ALL_VALUE ? undefined : (type as NotificationType),
    unreadOnly: readStatus === UNREAD_VALUE,
    limit: 30
  });

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    []
  );

  const typeLabel = (value: string) => {
    const key = `notificationManagement.types.${value}`;
    return isI18nKey(key) ? t(key) : value;
  };

  const items = listQuery.data?.items ?? [];
  const summary = summaryQuery.data;

  return (
    <AppShell title={t("notificationManagement.title")} subtitle={t("notificationManagement.subtitle")}>
      <div className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaryQuery.isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : summaryQuery.isError ? (
            <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(summaryQuery.error, "errors.unexpected")}
            </div>
          ) : summary ? (
            <>
              <MetricCard label={t("notificationManagement.total")} value={summary.total} icon={BellRing} />
              <MetricCard label={t("notificationManagement.unread")} value={summary.unreadTotal} icon={BellRing} />
              <MetricCard label={t("notificationManagement.last24Hours")} value={summary.last24Hours} icon={BellRing} />
              <MetricCard
                label={t("notificationManagement.enrollmentType")}
                value={summary.byType.ENROLLMENT_SUCCESS ?? 0}
                icon={BellRing}
              />
            </>
          ) : null}
        </section>

        <section className="grid gap-3 rounded-lg border border-border/70 bg-card p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("notificationManagement.searchPlaceholder")}
                className="h-10 rounded-md border-border/80 pl-9 shadow-none"
                type="search"
                aria-label={t("notificationManagement.searchPlaceholder")}
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-10 w-full rounded-md border-border/80 shadow-none" aria-label={t("notificationManagement.type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("notificationManagement.typeAll")}</SelectItem>
                {NOTIFICATION_FILTER_TYPES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {typeLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={readStatus} onValueChange={setReadStatus}>
              <SelectTrigger className="h-10 w-full rounded-md border-border/80 shadow-none" aria-label={t("notificationManagement.status")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("notificationManagement.statusAll")}</SelectItem>
                <SelectItem value={UNREAD_VALUE}>{t("notificationManagement.unreadOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-lg border border-border/70 bg-card">
          {listQuery.isLoading ? <TableSkeleton cols={6} rows={8} /> : null}
          {listQuery.isError ? (
            <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(listQuery.error, "errors.unexpected")}
            </div>
          ) : null}
          {!listQuery.isLoading && !listQuery.isError ? (
            items.length ? (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("notificationManagement.createdAt")}
                      </TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("notificationManagement.recipient")}
                      </TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("notificationManagement.type")}
                      </TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("notificationManagement.titleColumn")}
                      </TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("notificationManagement.status")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-border/60">
                        <TableCell className="px-4 py-3 text-sm text-muted-foreground">{formatter.format(new Date(item.createdAt))}</TableCell>
                        <TableCell className="px-4 py-3 text-sm font-medium text-foreground">{item.user.email}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="outline" className="rounded-md font-normal">
                            {typeLabel(item.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md px-4 py-3">
                          <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                          {item.body ? <p className="truncate text-xs text-muted-foreground">{item.body}</p> : null}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant={item.readAt ? "outline" : "secondary"} className="rounded-md font-normal">
                            {item.readAt ? t("notificationManagement.read") : t("notificationManagement.unreadStatus")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={BellRing}
                title={t("notificationManagement.empty")}
                description={t("notificationManagement.emptyDescription")}
              />
            )
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
