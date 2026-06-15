import { BookOpen, FileText, GraduationCap, Layers, Layers3, Lock, Plus, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { CourseCatalogCard } from "../components/course-catalog-card";
import { CourseStudioPageHero } from "../components/course-studio-page-hero";
import { CourseStatusBadge } from "../components/course-status-badge";
import { EmptyState } from "../components/empty-state";
import { CourseCardGridSkeleton } from "../components/skeleton";
import { COURSE_STATUS, USER_ROLE } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { useCourses } from "../hooks/use-courses";
import { useEnrollCourse } from "../hooks/use-enrollments";
import { useCurrentUser } from "../hooks/use-current-user";
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
        canManageCourses ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" className="h-10 rounded-lg gap-1.5 px-4 shadow-none" variant="outline">
              <Link to="/courses/learning-paths">
                <Layers3 className="size-4" aria-hidden />
                {t("learningPathStudio.navLink")}
              </Link>
            </Button>
            {canCreateCourse ? (
              <Button asChild size="sm" className="h-10 rounded-lg gap-1.5 px-4 shadow-none">
                <Link to="/courses/new">
                  <Plus className="size-4" aria-hidden />
                  {t("courseStudio.createCourse")}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="overflow-x-hidden space-y-8">
        <CourseStudioPageHero
          title={isAdmin ? t("courseStudio.adminMode") : t("courseStudio.instructorMode")}
          description={isAdmin ? t("courseStudio.adminModeDescription") : t("courseStudio.instructorModeDescription")}
          icon={isAdmin ? <ShieldCheck className="size-5" aria-hidden /> : <BookOpen className="size-5" aria-hidden />}
          loading={isLoading}
          stats={stats.map((item) => {
            const Icon = item.icon;
            return {
              label: item.label,
              value: item.value,
              icon: <Icon className="size-5" aria-hidden />
            };
          })}
          action={
            isAdmin ? (
              <Button asChild variant="outline" size="sm" className="h-9 rounded-xl shadow-none">
                <Link to="/audit">{t("nav.audit")}</Link>
              </Button>
            ) : null
          }
        />

        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("courseStudio.courses")}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {canManageCourses ? t("courseStudio.manageDescription") : t("courseStudio.catalogDescription")}
              </p>
            </div>
          </div>

          {isLoading ? <CourseCardGridSkeleton rows={6} /> : null}
          {isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {formatError(error, "errors.unexpected")}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            courses.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((course) => (
                  <CourseCatalogCard
                    key={course.id}
                    course={course}
                    href={`/courses/${course.id}`}
                    viewLabel={t("courseStudio.open")}
                    noDescriptionLabel={t("courseStudio.noDescription")}
                    enrolledLearnersLabel={t("explore.enrolledLearners")}
                    durationUnitLabel={t("courseStudio.courseDurationUnit")}
                    statusSlot={<CourseStatusBadge status={course.status} label={t(`courseStatus.${course.status}` as I18nKey)} />}
                    metaSlot={
                      canManageCourses ? (
                        <span className="inline-flex items-center gap-1.5">
                          {t("courseStudio.id")} {course.id.slice(0, 8)}
                        </span>
                      ) : undefined
                    }
                    secondaryAction={
                      !canManageCourses ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-10 flex-1 rounded-md px-4"
                          disabled={enrollMutation.isPending || course.status !== COURSE_STATUS.published}
                          onClick={() => void enrollMutation.mutateAsync(course.id)}
                          type="button"
                        >
                          {t("courseStudio.enroll")}
                        </Button>
                      ) : undefined
                    }
                  />
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
        </section>
      </div>
    </AppShell>
  );
}
