import { FileClock, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { TableSkeleton } from "../components/skeleton";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { useI18n } from "../i18n";

const ALL_VALUE = "all";
const ACTION_OPTIONS = ["USER_UPDATED", "USER_STATUS_UPDATED", "COURSE_PUBLISHED", "COURSE_ARCHIVED", "COURSE_STATUS_UPDATED"] as const;
const ENTITY_OPTIONS = ["User", "Course"] as const;

function formatMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return "—";
  }

  return JSON.stringify(metadata);
}

export function AuditLogsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [action, setAction] = useState(ALL_VALUE);
  const [entityType, setEntityType] = useState(ALL_VALUE);
  const { data, isLoading, isError, error } = useAuditLogs({
    search: debouncedSearch,
    action: action === ALL_VALUE ? undefined : action,
    entityType: entityType === ALL_VALUE ? undefined : entityType,
    limit: 30
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const items = data?.items ?? [];
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    []
  );

  return (
    <AppShell title={t("audit.title")} subtitle={t("audit.subtitle")}>
      <div className="space-y-5">
        <section className="grid gap-3 rounded-lg border border-border/70 bg-card p-4">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("audit.searchPlaceholder")}
                className="h-10 rounded-md border-border/80 pl-9 shadow-none"
                type="search"
                aria-label={t("audit.searchPlaceholder")}
              />
            </div>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="h-10 w-full rounded-md border-border/80 shadow-none" aria-label={t("audit.action")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("audit.actionAll")}</SelectItem>
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="h-10 w-full rounded-md border-border/80 shadow-none" aria-label={t("audit.entityType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>{t("audit.entityAll")}</SelectItem>
                {ENTITY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-lg border border-border/70 bg-card">
          {isLoading ? <TableSkeleton cols={6} rows={8} /> : null}
          {isError ? (
            <div className="m-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {(error as Error).message}
            </div>
          ) : null}
          {!isLoading && !isError ? (
            items.length ? (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("audit.createdAt")}</TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("audit.action")}</TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("audit.actor")}</TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("audit.target")}</TableHead>
                      <TableHead className="h-11 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("audit.metadata")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-border/60 align-top">
                        <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{formatter.format(new Date(item.createdAt))}</TableCell>
                        <TableCell className="px-4 py-3">
                          <Badge variant="secondary" className="rounded-md">{item.action}</Badge>
                        </TableCell>
                        <TableCell className="max-w-64 px-4 py-3">
                          <p className="truncate text-sm font-medium">{item.actor?.email ?? item.actorId ?? "—"}</p>
                          {item.actor?.role ? <p className="mt-1 text-xs text-muted-foreground">{item.actor.role}</p> : null}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <p className="text-sm font-medium">{item.entityType}</p>
                          <p className="mt-1 max-w-56 truncate font-mono text-xs text-muted-foreground">{item.entityId}</p>
                        </TableCell>
                        <TableCell className="max-w-xl px-4 py-3">
                          <code className="line-clamp-3 break-all rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">{formatMetadata(item.metadata)}</code>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-6">
                <EmptyState icon={FileClock} title={t("audit.noLogs")} description={t("audit.noLogsDescription")} />
              </div>
            )
          ) : null}
          {!isLoading && !isError ? (
            <p className="border-t border-border/60 px-4 py-3 text-xs text-muted-foreground">
              Page {data?.pagination.page ?? 1} · {data?.pagination.limit ?? 30} {t("audit.pageSize")} · {data?.pagination.total ?? 0} total
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
