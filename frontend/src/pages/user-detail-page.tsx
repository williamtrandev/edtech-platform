import { ArrowLeft, Ban, Bell, BookOpen, CheckCircle2, FileCheck2, GraduationCap, History, Mail, RotateCcw, Shield, UserRound } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { MetricCardSkeleton, TableSkeleton } from "../components/skeleton";
import { USER_ROLE, USER_STATUS, type UserRole, type UserStatus } from "../constants/business";
import { useAuditLogs } from "../hooks/use-audit-logs";
import { useUpdateUser, useUser } from "../hooks/use-users";
import { type I18nKey, useI18n } from "../i18n";

function useDateFormatter() {
  return useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short"
      }),
    []
  );
}

export function UserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t, formatError } = useI18n();
  const formatter = useDateFormatter();
  const userQuery = useUser(userId);
  const auditQuery = useAuditLogs({ search: userId, limit: 6 });
  const updateUserMutation = useUpdateUser();

  const user = userQuery.data;
  const statusLabel = user?.status === USER_STATUS.suspended ? t("users.statusSuspended") : t("users.statusActive");
  const statusVariant = user?.status === USER_STATUS.suspended ? "destructive" : "secondary";

  const onRoleChange = async (role: UserRole) => {
    if (!user) return;

    try {
      await updateUserMutation.mutateAsync({ id: user.id, payload: { role } });
      toast.success(t("users.updated"));
    } catch (error) {
      toast.error(formatError(error, "users.updateFailed"));
    }
  };

  const onStatusToggle = async (status: UserStatus) => {
    if (!user) return;

    try {
      await updateUserMutation.mutateAsync({ id: user.id, payload: { status } });
      toast.success(t(status === USER_STATUS.suspended ? "users.suspended" : "users.reactivated"));
    } catch (error) {
      toast.error(formatError(error, "users.statusUpdateFailed"));
    }
  };

  return (
    <AppShell title={t("users.detailTitle")} subtitle={t("users.detailSubtitle")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-md px-3 shadow-none" onClick={() => navigate("/users")}>
            <ArrowLeft className="mr-1.5 size-4" aria-hidden />
            {t("users.backToUsers")}
          </Button>
          {user ? (
            <Badge variant={statusVariant} className="h-7 rounded-md px-3">
              {statusLabel}
            </Badge>
          ) : null}
        </div>

        {userQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <MetricCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {userQuery.isError ? (
          <Card>
            <CardContent className="pt-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {formatError(userQuery.error, "errors.unexpected")}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {user ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={BookOpen} label={t("users.detailCreatedCourses")} value={user.summary.createdCourses} hint={t("users.detailCreatedCoursesHint")} />
              <MetricCard icon={GraduationCap} label={t("users.detailEnrollments")} value={user.summary.enrollments} hint={t("users.detailEnrollmentsHint")} />
              <MetricCard icon={CheckCircle2} label={t("users.detailCompletedLessons")} value={user.summary.completedLessons} hint={t("users.detailCompletedLessonsHint")} />
              <MetricCard icon={FileCheck2} label={t("users.detailCertificates")} value={user.summary.certificates} hint={t("users.detailCertificatesHint")} />
            </section>

            <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.55fr)]">
              <Card>
                <CardHeader className="border-b border-border/70 pb-4">
                  <CardTitle>{t("users.identityTitle")}</CardTitle>
                  <CardDescription>{t("users.identityDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-1">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField icon={Mail} label={t("users.email")} value={user.email} />
                    <DetailField icon={UserRound} label={t("users.userId")} value={user.id} mono />
                    <DetailField icon={History} label={t("users.createdAt")} value={formatter.format(new Date(user.createdAt))} />
                    <DetailField icon={History} label={t("users.updatedAt")} value={formatter.format(new Date(user.updatedAt))} />
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <label htmlFor="user-detail-role" className="text-sm font-medium text-foreground">
                        {t("users.role")}
                      </label>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("users.roleChangeDescription")}</p>
                    </div>
                    <Select value={user.role} onValueChange={(value) => void onRoleChange(value as UserRole)}>
                      <SelectTrigger
                        id="user-detail-role"
                        className="h-10 w-full rounded-md border-border/80 shadow-none sm:w-48"
                        disabled={updateUserMutation.isPending}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={USER_ROLE.user}>{t("role.USER")}</SelectItem>
                        <SelectItem value={USER_ROLE.instructor}>{t("role.INSTRUCTOR")}</SelectItem>
                        <SelectItem value={USER_ROLE.admin}>{t("role.ADMIN")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("users.status")}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("users.statusChangeDescription")}</p>
                    </div>
                    <Button
                      type="button"
                      variant={user.status === USER_STATUS.active ? "outline" : "secondary"}
                      size="sm"
                      className="h-10 rounded-md px-3 shadow-none"
                      disabled={updateUserMutation.isPending}
                      onClick={() => void onStatusToggle(user.status === USER_STATUS.active ? USER_STATUS.suspended : USER_STATUS.active)}
                    >
                      {user.status === USER_STATUS.active ? <Ban className="mr-1.5 size-4" aria-hidden /> : <RotateCcw className="mr-1.5 size-4" aria-hidden />}
                      {t(user.status === USER_STATUS.active ? "users.suspend" : "users.reactivate")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b border-border/70 pb-4">
                  <CardTitle>{t("users.activityTitle")}</CardTitle>
                  <CardDescription>{t("users.activityDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="pt-1">
                  {auditQuery.isLoading ? <TableSkeleton cols={2} rows={4} /> : null}
                  {auditQuery.isError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {formatError(auditQuery.error, "errors.unexpected")}
                    </div>
                  ) : null}
                  {!auditQuery.isLoading && !auditQuery.isError ? (
                    auditQuery.data?.items.length ? (
                      <div className="divide-y divide-border/70">
                        {auditQuery.data.items.map((item) => (
                          <div key={item.id} className="grid gap-1 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <Badge variant="outline" className="rounded-md">
                                {item.action}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{formatter.format(new Date(item.createdAt))}</span>
                            </div>
                            <p className="truncate text-sm text-foreground">
                              {item.entityType} · <span className="font-mono text-xs text-muted-foreground">{item.entityId}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={Shield} title={t("users.noActivity")} description={t("users.noActivityDescription")} />
                    )
                  ) : null}
                  <Button asChild variant="outline" size="sm" className="mt-4 h-9 rounded-md px-3 shadow-none">
                    <Link to={`/audit?search=${encodeURIComponent(user.id)}`}>{t("users.viewAudit")}</Link>
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard icon={Bell} label={t("users.detailNotifications")} value={user.summary.notifications} hint={t("users.detailNotificationsHint")} />
              <MetricCard icon={FileCheck2} label={t("users.detailSubmissions")} value={user.summary.assignmentSubmissions} hint={t("users.detailSubmissionsHint")} />
              <MetricCard icon={Shield} label={t("users.detailExamAttempts")} value={user.summary.examAttempts} hint={t("users.detailExamAttemptsHint")} />
            </section>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}

function DetailField({
  icon: Icon,
  label,
  value,
  mono = false
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-border/70 bg-background px-3 py-3">
      <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={mono ? "mt-1 truncate font-mono text-xs text-foreground" : "mt-1 truncate text-sm font-medium text-foreground"}>{value}</p>
      </div>
    </div>
  );
}
