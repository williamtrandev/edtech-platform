import { ArrowLeft, BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, Eye, List, Loader2, Lock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { CourseDiscussionPanel } from "../components/course-discussion-panel";
import { CourseGradeTimeline } from "../components/course-grade-timeline";
import { CourseLearnCurriculum } from "../components/course-learn-curriculum";
import { CourseProgressBar } from "../components/course-progress-bar";
import { ProgressOfflineSyncBanner } from "../components/progress-offline-sync-banner";
import { EmptyState } from "../components/empty-state";
import { LearnerLessonContent } from "../components/learner-lesson-content";
import { LESSON_CONTENT_TYPE, USER_ROLE } from "../constants/business";
import { useAuth } from "../hooks/use-auth";
import { useCourseDetail, useCourseLessons } from "../hooks/use-courses";
import { useCurrentUser } from "../hooks/use-current-user";
import { useMyEnrollments } from "../hooks/use-enrollments";
import { useProgressOfflineSync } from "../hooks/use-progress-offline-sync";
import { useCompleteLesson, useCourseLessonProgress, useCourseProgress, useSaveLessonWatchPosition } from "../hooks/use-progress";
import { isLessonProgressQueued } from "../lib/lesson-progress-write";
import { useI18n } from "../i18n";
import { getCourseLearnPath, getCoursePreviewPath, isCoursePreviewPath } from "../lib/course-learn-path";
import { buildFreshLearnerUnlockById, buildLessonUnlockById, findFirstUnlockedIncompleteLessonId } from "../lib/lesson-unlock";

export function CourseLearnPage() {
  const { courseId = "", lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isPreviewMode = isCoursePreviewPath(location.pathname);
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const courseQuery = useCourseDetail(courseId);
  const lessonsQuery = useCourseLessons(courseId, Boolean(courseId));
  const myEnrollmentsQuery = useMyEnrollments(isAuthenticated && !isBootstrapping && !isPreviewMode);
  const progressQuery = useCourseProgress(courseId, isAuthenticated && !isBootstrapping && !isPreviewMode);
  const lessonProgressQuery = useCourseLessonProgress(courseId, isAuthenticated && !isBootstrapping && !isPreviewMode);
  const completeLessonMutation = useCompleteLesson(courseId);
  const saveWatchPositionMutation = useSaveLessonWatchPosition(courseId);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const { t, formatError } = useI18n();

  const lessons = lessonsQuery.data ?? [];
  const lessonProgressById = useMemo(() => {
    const map = new Map<string, { isCompleted: boolean; watchPositionSeconds: number }>();
    for (const item of lessonProgressQuery.data?.items ?? []) {
      map.set(item.lessonId, {
        isCompleted: item.isCompleted,
        watchPositionSeconds: item.watchPositionSeconds ?? 0
      });
    }
    return map;
  }, [lessonProgressQuery.data?.items]);

  const isEnrolled = Boolean(myEnrollmentsQuery.data?.some((enrollment) => enrollment.courseId === courseId));
  const isCourseOwner = meQuery.data?.id === courseQuery.data?.instructorId;
  const isAdmin = meQuery.data?.role === USER_ROLE.admin;
  const canPreviewCourse = isPreviewMode && (isCourseOwner || isAdmin);
  const canLearn = isEnrolled && !isCourseOwner && !isAdmin;
  const canAccessLearn = canLearn || canPreviewCourse;
  const learnPath = isPreviewMode ? getCoursePreviewPath : getCourseLearnPath;
  const { pendingCount, isSyncing, flush } = useProgressOfflineSync({
    courseId,
    enabled: canLearn
  });

  const lessonUnlockById = useMemo(() => {
    if (isPreviewMode) {
      return buildFreshLearnerUnlockById(lessons);
    }

    return buildLessonUnlockById(lessonProgressQuery.data?.items ?? []);
  }, [isPreviewMode, lessonProgressQuery.data?.items, lessons]);

  const selectedLessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const selectedLesson = selectedLessonIndex >= 0 ? lessons[selectedLessonIndex] : null;
  const selectedProgress = selectedLesson ? lessonProgressById.get(selectedLesson.id) : undefined;
  const selectedUnlock = selectedLesson ? lessonUnlockById.get(selectedLesson.id) : undefined;
  const isLessonLocked = Boolean(selectedUnlock && !selectedUnlock.isUnlocked);
  const isLessonCompleted = Boolean(selectedProgress?.isCompleted);
  const isQuizLesson = selectedLesson?.contentType === LESSON_CONTENT_TYPE.quiz;

  useEffect(() => {
    if (!canAccessLearn || lessonsQuery.isLoading || lessonId || lessons.length === 0) {
      return;
    }

    const lessonIdsInOrder = lessons.map((lesson) => lesson.id);
    const firstIncompleteId = findFirstUnlockedIncompleteLessonId(lessonIdsInOrder, lessonProgressById, lessonUnlockById);
    const targetLessonId = firstIncompleteId ?? lessonIdsInOrder[0];
    if (targetLessonId) {
      navigate(learnPath(courseId, targetLessonId), { replace: true });
    }
  }, [canAccessLearn, courseId, learnPath, lessonId, lessonProgressById, lessonUnlockById, lessons, lessonsQuery.isLoading, navigate]);

  useEffect(() => {
    if (!canAccessLearn || !lessonId || lessons.length === 0) {
      return;
    }

    if (!isPreviewMode && lessonProgressQuery.isLoading) {
      return;
    }

    const unlock = lessonUnlockById.get(lessonId);
    if (unlock && !unlock.isUnlocked) {
      const lessonIdsInOrder = lessons.map((lesson) => lesson.id);
      const fallbackId = findFirstUnlockedIncompleteLessonId(lessonIdsInOrder, lessonProgressById, lessonUnlockById) ?? lessonIdsInOrder[0];
      if (fallbackId && fallbackId !== lessonId) {
        navigate(learnPath(courseId, fallbackId), { replace: true });
      }
    }
  }, [
    canAccessLearn,
    courseId,
    isPreviewMode,
    learnPath,
    lessonId,
    lessonProgressById,
    lessonProgressQuery.isLoading,
    lessonUnlockById,
    lessons,
    navigate
  ]);

  useEffect(() => {
    setCurriculumOpen(false);
  }, [lessonId]);

  if (!isBootstrapping && !isAuthenticated) {
    const redirectPath = isPreviewMode ? getCoursePreviewPath(courseId, lessonId) : getCourseLearnPath(courseId, lessonId);
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirectPath)}`} replace />;
  }

  if (meQuery.isLoading || courseQuery.isLoading || (!isPreviewMode && myEnrollmentsQuery.isLoading)) {
    return (
      <AppShell immersive title={t("courseLearn.loadingTitle")} subtitle={t("courseLearn.loadingSubtitle")}>
        <div className="h-[calc(100dvh-3.5rem)] animate-pulse bg-muted/30" />
      </AppShell>
    );
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <AppShell immersive title={t("courseLearn.loadFailedTitle")} subtitle={t("courseLearn.loadFailedSubtitle")}>
        <EmptyState
          icon={BookOpenText}
          title={t("courseLearn.loadFailedTitle")}
          description={t("courseLearn.loadFailedSubtitle")}
          action={
            <Button asChild size="sm" className="rounded-lg">
              <Link to="/dashboard">{t("courseLearn.backToLearning")}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  if (!canPreviewCourse && (isCourseOwner || isAdmin)) {
    return <Navigate to={`/courses/${courseId}`} replace />;
  }

  if (!canAccessLearn) {
    return <Navigate to={`/courses/${courseId}`} replace />;
  }

  const course = courseQuery.data;

  const handleSelectLesson = (targetLessonId: string) => {
    navigate(learnPath(courseId, targetLessonId));
  };

  const handleCompleteLesson = async () => {
    if (isPreviewMode || !selectedLesson || isLessonCompleted || isLessonLocked) {
      return;
    }

    try {
      const result = await completeLessonMutation.mutateAsync(selectedLesson.id);
      if (isLessonProgressQueued(result)) {
        toast.message(t("courseLearn.offlineProgressQueued"));
        return;
      }

      toast.success(t("courseLearn.lessonCompletedToast"));
    } catch (error) {
      toast.error(formatError(error, "courseLearn.lessonCompleteFailed"));
    }
  };

  const handleSaveWatchPosition = (targetLessonId: string, watchPositionSeconds: number) => {
    if (isPreviewMode) {
      return;
    }

    const unlock = lessonUnlockById.get(targetLessonId);
    if (unlock && !unlock.isUnlocked) {
      return;
    }

    saveWatchPositionMutation.mutate({ lessonId: targetLessonId, watchPositionSeconds });
  };

  const findAdjacentUnlockedLesson = (startIndex: number, step: -1 | 1) => {
    for (let index = startIndex; index >= 0 && index < lessons.length; index += step) {
      const lesson = lessons[index];
      const unlock = lessonUnlockById.get(lesson.id);
      if (!unlock || unlock.isUnlocked) {
        return lesson;
      }
    }

    return null;
  };

  const previousUnlockedLesson = selectedLessonIndex > 0 ? findAdjacentUnlockedLesson(selectedLessonIndex - 1, -1) : null;
  const nextUnlockedLesson =
    selectedLessonIndex >= 0 && selectedLessonIndex < lessons.length - 1
      ? findAdjacentUnlockedLesson(selectedLessonIndex + 1, 1)
      : null;

  const curriculumPanel = (
    <CourseLearnCurriculum
      lessons={lessons}
      selectedLessonId={selectedLesson?.id}
      lessonProgressById={lessonProgressById}
      lessonUnlockById={lessonUnlockById}
      onSelectLesson={handleSelectLesson}
      className="h-full"
    />
  );

  return (
    <AppShell immersive title={course.title} subtitle={isPreviewMode ? t("coursePreview.subtitle") : t("courseLearn.subtitle")}>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-background">
        {isPreviewMode ? (
          <div className="shrink-0 border-b border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/40 sm:px-4" role="status">
            <div className="flex items-start gap-2.5">
              <Eye className="mt-0.5 size-4 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">{t("coursePreview.bannerTitle")}</p>
                <p className="mt-0.5 text-xs leading-5 text-amber-900/90 dark:text-amber-200/90">{t("coursePreview.bannerDescription")}</p>
              </div>
            </div>
          </div>
        ) : null}
        <div className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-3 py-2.5 backdrop-blur-sm sm:px-4">
          <Button asChild variant="ghost" size="sm" className="h-8 shrink-0 rounded-md px-2">
            <Link to={isPreviewMode ? `/courses/${courseId}` : "/dashboard"}>
              <ArrowLeft className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1.5">
                {isPreviewMode ? t("coursePreview.backToStudio") : t("courseLearn.backToLearning")}
              </span>
            </Link>
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
            {!isPreviewMode && progressQuery.data ? (
              <div className="mt-1.5 max-w-xs">
                <CourseProgressBar
                  percentage={progressQuery.data.percentage}
                  completedLessons={progressQuery.data.completedLessons}
                  totalLessons={progressQuery.data.totalLessons}
                  passedExams={progressQuery.data.passedExams}
                  totalExams={progressQuery.data.totalExams}
                  submittedAssignments={progressQuery.data.submittedAssignments}
                  totalAssignments={progressQuery.data.totalAssignments}
                />
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 rounded-md px-2.5 lg:hidden"
            onClick={() => setCurriculumOpen(true)}
          >
            <List className="size-4" aria-hidden />
            <span className="sr-only">{t("courseLearn.openCurriculum")}</span>
          </Button>
        </div>

        {canLearn ? (
          <div className="shrink-0 border-b border-border/70 px-3 py-2 sm:px-4">
            <ProgressOfflineSyncBanner pendingCount={pendingCount} isSyncing={isSyncing} onSyncNow={() => void flush()} />
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[10.5rem_minmax(0,1fr)] xl:grid-cols-[11.5rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-border/60 bg-muted/10 lg:block">
            <div className="sticky top-0 flex max-h-[calc(100dvh-3.5rem-3rem)] flex-col overflow-y-auto px-2 py-3">
              {lessonsQuery.isLoading ? (
                <div className="space-y-1">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-7 animate-pulse rounded-md bg-muted/50" aria-hidden />
                  ))}
                </div>
              ) : lessons.length ? (
                <>
                  <div className="min-h-0 flex-1">{curriculumPanel}</div>
                  {!isPreviewMode ? <CourseGradeTimeline courseId={courseId} enabled={canLearn} /> : null}
                </>
              ) : (
                <EmptyState icon={BookOpenText} title={t("courseLearn.noLessonsTitle")} description={t("courseLearn.noLessonsDescription")} />
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            {selectedLesson ? (
              <>
                <header className="shrink-0 border-b border-border/60 px-4 py-4 sm:px-6 lg:px-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="h-5 rounded px-1.5 text-[10px] font-medium">
                      {selectedLessonIndex + 1}/{lessons.length}
                    </Badge>
                    {isLessonCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                        <CheckCircle2 className="size-3" aria-hidden />
                        {t("courseLearn.completed")}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                    {selectedLesson.title}
                  </h1>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
                  {isLessonLocked ? (
                    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-6 py-10 text-center">
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Lock className="size-5" aria-hidden />
                      </span>
                      <h2 className="text-base font-semibold text-foreground">{t("courseLearn.lessonLockedTitle")}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedUnlock?.lockedByLessonTitle
                          ? t("courseLearn.lessonLockedDescription").replace("{lesson}", selectedUnlock.lockedByLessonTitle)
                          : t("courseLearn.lessonLockedDescriptionGeneric")}
                      </p>
                      {selectedUnlock?.lockedByLessonId ? (
                        <Button
                          type="button"
                          size="sm"
                          className="mt-1 rounded-lg"
                          onClick={() => handleSelectLesson(selectedUnlock.lockedByLessonId!)}
                        >
                          {t("courseLearn.goToPrerequisite")}
                        </Button>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <LearnerLessonContent
                        lesson={selectedLesson}
                        courseId={courseId}
                        canAttemptQuiz={canLearn}
                        watchPositionSeconds={selectedProgress?.watchPositionSeconds ?? 0}
                        onSaveWatchPosition={handleSaveWatchPosition}
                        onQuizGraded={() => {
                          void handleCompleteLesson();
                        }}
                        resumeVideoLabel={t("courseLearn.resumeVideo")}
                      />
                      {canLearn && !isPreviewMode ? (
                        <CourseDiscussionPanel
                          courseId={courseId}
                          lessonId={selectedLesson.id}
                          currentUserId={meQuery.data?.id}
                          canParticipate={canLearn}
                        />
                      ) : null}
                    </>
                  )}
                </div>

                <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-lg"
                        disabled={!previousUnlockedLesson}
                        onClick={() => {
                          if (previousUnlockedLesson) {
                            handleSelectLesson(previousUnlockedLesson.id);
                          }
                        }}
                      >
                        <ChevronLeft className="mr-1 size-4" aria-hidden />
                        {t("courseLearn.previousLesson")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-lg"
                        disabled={!nextUnlockedLesson}
                        onClick={() => {
                          if (nextUnlockedLesson) {
                            handleSelectLesson(nextUnlockedLesson.id);
                          }
                        }}
                      >
                        {t("courseLearn.nextLesson")}
                        <ChevronRight className="ml-1 size-4" aria-hidden />
                      </Button>
                    </div>

                    {!isPreviewMode && !isLessonCompleted && !isLessonLocked && !isQuizLesson ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-10 min-w-[10rem] rounded-lg"
                        disabled={completeLessonMutation.isPending}
                        onClick={() => void handleCompleteLesson()}
                      >
                        {completeLessonMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                            {t("courseLearn.savingProgress")}
                          </>
                        ) : (
                          t("courseLearn.markComplete")
                        )}
                      </Button>
                    ) : null}
                  </div>
                </footer>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-4 py-10">
                <EmptyState icon={BookOpenText} title={t("courseLearn.selectLessonTitle")} description={t("courseLearn.selectLessonDescription")} />
              </div>
            )}
          </div>
        </div>

        {curriculumOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button type="button" className="absolute inset-0 bg-background/70 backdrop-blur-sm" aria-label={t("courseLearn.closeCurriculum")} onClick={() => setCurriculumOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-52 max-w-[85vw] flex-col border-r border-border bg-background p-2 shadow-xl">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-medium text-muted-foreground">{t("courseLearn.curriculum")}</p>
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-lg" onClick={() => setCurriculumOpen(false)}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {curriculumPanel}
                {!isPreviewMode ? <CourseGradeTimeline courseId={courseId} enabled={canLearn} /> : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
