import { ArrowUpRight, BookOpen, FileText, GraduationCap, Layers, Lock, Plus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { CourseStatusBadge } from "../components/course-status-badge";
import { EmptyState } from "../components/empty-state";
import { CourseListSkeleton } from "../components/skeleton";
import { COURSE_STATUS, USER_ROLE } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { useCourses } from "../hooks/use-courses";
import { useEnrollCourse } from "../hooks/use-enrollments";
import { useCurrentUser } from "../hooks/use-current-user";
import { toMediaUrl } from "../lib/media-url";
import { type I18nKey, useI18n } from "../i18n";

export function CoursesPage() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const { data, isLoading, isError, error } = useCourses();
  const enrollMutation = useEnrollCourse();
  const { t, formatError } = useI18n();

  const canCreateCourse = meQuery.data?.role === USER_ROLE.instructor;
  const isAdmin = meQuery.data?.role === USER_ROLE.admin;
  const canManageCourses = meQuery.data?.role === USER_ROLE.instructor || meQuery.data?.role === USER_ROLE.admin;
  const pageTitle = isAdmin ? t("courseStudio.adminTitle") : t("courseStudio.title");
  const pageSubtitle = isAdmin ? t("courseStudio.adminSubtitle") : t("courseStudio.subtitle");
  const emptyDescription = canCreateCourse
    ? t("courseStudio.noCoursesCreate")
    : canManageCourses
      ? t("courseStudio.noCoursesManage")
      : t("courseStudio.noCoursesBrowse");
  const courses = data?.items ?? [];
  const publishedCount = courses.filter((course) => course.status === COURSE_STATUS.published).length;
  const draftCount = courses.filter((course) => course.status === COURSE_STATUS.draft).length;
  const lockedCount = courses.filter((course) => course.status === COURSE_STATUS.locked).length;
  const stats = isAdmin
    ? [
        { icon: Layers, label: t("courseStudio.total"), value: courses.length },
        { icon: GraduationCap, label: t("courseStudio.published"), value: publishedCount },
        { icon: Lock, label: t("courseStudio.locked"), value: lockedCount }
      ]
    : [
        { icon: Layers, label: t("courseStudio.total"), value: courses.length },
        { icon: GraduationCap, label: t("courseStudio.published"), value: publishedCount },
        { icon: FileText, label: t("courseStudio.drafts"), value: draftCount }
      ];

  return (
    <AppShell
      title={pageTitle}
      subtitle={pageSubtitle}
      actions={
        canCreateCourse ? (
          <Button asChild size="sm" className="h-10 rounded-lg gap-1.5 px-4 shadow-none">
            <Link to="/courses/new">
              <Plus className="size-4" aria-hidden />
              {t("courseStudio.createCourse")}
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="rounded-xl bg-card px-4 py-4 ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                {isAdmin ? <ShieldCheck className="size-4" aria-hidden /> : <BookOpen className="size-4" aria-hidden />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{isAdmin ? t("courseStudio.adminMode") : t("courseStudio.instructorMode")}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {isAdmin ? t("courseStudio.adminModeDescription") : t("courseStudio.instructorModeDescription")}
                </p>
              </div>
            </div>
            {isAdmin ? (
              <Button asChild variant="outline" size="sm" className="h-10 rounded-md px-4 shadow-none">
                <Link to="/audit">{t("nav.audit")}</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Course summary">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{isLoading ? "..." : item.value}</p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6">
          <Card className="">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">{t("courseStudio.courses")}</CardTitle>
                <CardDescription>{canManageCourses ? t("courseStudio.manageDescription") : t("courseStudio.catalogDescription")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <CourseListSkeleton rows={5} /> : null}
              {isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {formatError(error, "errors.unexpected")}
                </div>
              ) : null}

              {!isLoading && !isError ? (
                courses.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => (
                      <article key={course.id} className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-colors hover:border-border">
                          <div className="relative aspect-video bg-muted/30">
                          {course.coverImageUrl ? (
                            <img src={toMediaUrl(course.coverImageUrl)} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <div className="grid size-full place-items-center text-muted-foreground">
                              <BookOpen className="size-7" aria-hidden />
                            </div>
                          )}
                          <div className="absolute left-3 top-3">
                            <CourseStatusBadge status={course.status} label={t(`courseStatus.${course.status}` as I18nKey)} />
                          </div>
                        </div>
                        <div className="grid min-h-44 gap-4 p-4">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">{course.title}</h3>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                              {course.description || `${t("courseStudio.id")} ${course.id.slice(0, 8)}`}
                            </p>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            {!canManageCourses ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-md px-4"
                                disabled={enrollMutation.isPending || course.status !== COURSE_STATUS.published}
                                onClick={() => void enrollMutation.mutateAsync(course.id)}
                                type="button"
                              >
                                {t("courseStudio.enroll")}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("courseStudio.id")} {course.id.slice(0, 8)}</span>
                            )}
                            <Button asChild size="sm" className="h-10 rounded-md gap-1.5 px-4">
                              <Link to={`/courses/${course.id}`}>
                                {t("courseStudio.open")}
                                <ArrowUpRight className="size-4" aria-hidden />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title={t("courseStudio.noCourses")}
                    description={emptyDescription}
                  />
                )
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
