import { ArrowLeft, BookOpenText, CheckCircle2, ChevronLeft, ChevronRight, Eye, Loader2, Lock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { CourseDiscussionPanel } from "../components/course-discussion-panel";
import { CourseGradeTimeline } from "../components/course-grade-timeline";
import { CourseLearnCurriculum } from "../components/course-learn-curriculum";
import { CourseLearnLessonHeader } from "../components/course-learn-lesson-header";
import { CourseLearnTopBar } from "../components/course-learn-top-bar";
import { CourseProgressBar } from "../components/course-progress-bar";
import { ProgressOfflineSyncBanner } from "../components/progress-offline-sync-banner";
import { EmptyState } from "../components/empty-state";
import { LearnerAssignmentPanel } from "../components/learner-assignment-panel";
import { LearnerLessonContent } from "../components/learner-lesson-content";
import { LearnerQuizLesson } from "../components/learner-quiz-lesson";
import { ASSIGNMENT_STATUS, EXAM_SCOPE, EXAM_STATUS, LESSON_CONTENT_TYPE, USER_ROLE } from "../constants/business";
import { useCourseAssignments } from "../hooks/use-assignments";
import { useAuth } from "../hooks/use-auth";
import { useCourseDetail, useCourseLessons } from "../hooks/use-courses";
import { useCurrentUser } from "../hooks/use-current-user";
import { useMyCertificates } from "../hooks/use-certificates";
import { useCourseExams } from "../hooks/use-exams";
import { useMyEnrollments } from "../hooks/use-enrollments";
import { useProgressOfflineSync } from "../hooks/use-progress-offline-sync";
import { useCompleteLesson, useCourseLessonProgress, useCourseProgress, useSaveLessonWatchPosition } from "../hooks/use-progress";
import { isLessonProgressQueued } from "../lib/lesson-progress-write";
import { useI18n } from "../i18n";
import { getCourseLearnPath, getCoursePreviewPath, getCourseReviewLearnPath, isCoursePreviewPath } from "../lib/course-learn-path";
import { findFirstUnlockedQuizLessonId } from "../lib/course-learn-quiz";
import { filterExamsByScope, findLessonScopedExam } from "../lib/exam-scope";
import { parseLessonContent } from "../lib/lesson-content";
import { buildFreshLearnerUnlockById, buildLessonUnlockById, findFirstUnlockedIncompleteLessonId } from "../lib/lesson-unlock";

export function CourseLearnPage() {
  const { courseId = "", lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReviewSession = searchParams.get("review") === "1";
  const isPreviewMode = isCoursePreviewPath(location.pathname);
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const courseQuery = useCourseDetail(courseId);
  const lessonsQuery = useCourseLessons(courseId, Boolean(courseId));
  const myEnrollmentsQuery = useMyEnrollments(isAuthenticated && !isBootstrapping && !isPreviewMode);
  const myCertificatesQuery = useMyCertificates(isAuthenticated && !isBootstrapping && !isPreviewMode);
  const progressQuery = useCourseProgress(courseId, isAuthenticated && !isBootstrapping && !isPreviewMode);
  const lessonProgressQuery = useCourseLessonProgress(courseId, isAuthenticated && !isBootstrapping && !isPreviewMode);
  const completeLessonMutation = useCompleteLesson(courseId);
  const saveWatchPositionMutation = useSaveLessonWatchPosition(courseId);
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [pendingCompletionLessonId, setPendingCompletionLessonId] = useState<string | null>(null);
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
  const courseCertificate = useMemo(
    () => myCertificatesQuery.data?.find((certificate) => certificate.courseId === courseId) ?? null,
    [courseId, myCertificatesQuery.data]
  );
  const learnPath = isPreviewMode ? getCoursePreviewPath : getCourseLearnPath;
  const { pendingCount, isSyncing, flush } = useProgressOfflineSync({
    courseId,
    enabled: canLearn
  });
  const assignmentsQuery = useCourseAssignments(courseId, canLearn && !isPreviewMode);
  const examsQuery = useCourseExams(courseId, canLearn && !isPreviewMode);
  const publishedAssignmentCount = useMemo(
    () => (assignmentsQuery.data ?? []).filter((item) => item.status === ASSIGNMENT_STATUS.published).length,
    [assignmentsQuery.data]
  );

  const lessonUnlockById = useMemo(() => {
    if (isPreviewMode) {
      return buildFreshLearnerUnlockById(lessons);
    }

    return buildLessonUnlockById(lessonProgressQuery.data?.items ?? []);
  }, [isPreviewMode, lessonProgressQuery.data?.items, lessons]);

  const publishedExamIds = useMemo(() => {
    const ids = new Set<string>();
    for (const exam of examsQuery.data ?? []) {
      if (exam.status === EXAM_STATUS.published) {
        ids.add(exam.id);
      }
    }
    return ids;
  }, [examsQuery.data]);

  const pendingQuizLessonId = useMemo(
    () => findFirstUnlockedQuizLessonId(lessons, lessonUnlockById, publishedExamIds, examsQuery.data ?? []),
    [lessons, lessonUnlockById, publishedExamIds, examsQuery.data]
  );

  const publishedCourseExams = useMemo(
    () =>
      filterExamsByScope(
        (examsQuery.data ?? []).filter((exam) => exam.status === EXAM_STATUS.published),
        EXAM_SCOPE.course
      ),
    [examsQuery.data]
  );

  const selectedLessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const selectedLesson = selectedLessonIndex >= 0 ? lessons[selectedLessonIndex] : null;
  const selectedProgress = selectedLesson ? lessonProgressById.get(selectedLesson.id) : undefined;
  const selectedUnlock = selectedLesson ? lessonUnlockById.get(selectedLesson.id) : undefined;
  const isLessonLocked = Boolean(selectedUnlock && !selectedUnlock.isUnlocked);
  const isLessonCompleted = Boolean(selectedProgress?.isCompleted);
  const isQuizLesson = selectedLesson?.contentType === LESSON_CONTENT_TYPE.quiz;
  const linkedLessonExercise = selectedLesson ? findLessonScopedExam(examsQuery.data ?? [], selectedLesson.id) : null;
  const quizContentExamId = useMemo(() => {
    if (!selectedLesson || selectedLesson.contentType !== LESSON_CONTENT_TYPE.quiz) {
      return null;
    }

    return parseLessonContent(selectedLesson.content, selectedLesson.contentType).examId?.trim() || null;
  }, [selectedLesson]);
  const showLinkedLessonExercise = Boolean(
    linkedLessonExercise && linkedLessonExercise.id !== quizContentExamId && !isLessonLocked && canLearn && !isPreviewMode
  );
  const isCompletingSelectedLesson = Boolean(selectedLesson?.id && pendingCompletionLessonId === selectedLesson.id);
  const isNavigationLocked = pendingCompletionLessonId !== null;

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
    if (isPreviewMode || !canLearn || !progressQuery.data?.isComplete || isReviewSession) {
      return;
    }

    navigate(`/courses/${courseId}/completed`, {
      replace: true,
      state: {
        certificateId: courseCertificate?.id ?? null,
        verificationCode: courseCertificate?.verificationCode ?? null
      }
    });
  }, [
    canLearn,
    courseCertificate?.id,
    courseCertificate?.verificationCode,
    courseId,
    isPreviewMode,
    isReviewSession,
    navigate,
    progressQuery.data?.isComplete
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
    if (isNavigationLocked) {
      return;
    }
    navigate(learnPath(courseId, targetLessonId));
  };

  const handleCompleteLesson = async (options?: { silent?: boolean }): Promise<boolean> => {
    if (isPreviewMode || !selectedLesson || isLessonCompleted || isLessonLocked) {
      return false;
    }

    try {
      setPendingCompletionLessonId(selectedLesson.id);
      const result = await completeLessonMutation.mutateAsync(selectedLesson.id);
      if (isLessonProgressQueued(result)) {
        toast.message(t("courseLearn.offlineProgressQueued"));
        return false;
      }

      if (!options?.silent) {
        toast.success(t("courseLearn.lessonCompletedToast"));
      }
      return true;
    } catch (error) {
      toast.error(formatError(error, "courseLearn.lessonCompleteFailed"));
      return false;
    } finally {
      setPendingCompletionLessonId((current) => (current === selectedLesson.id ? null : current));
    }
  };

  /** Completes the current lesson and, on success, advances to the next one to keep momentum. */
  const handleCompleteAndContinue = async () => {
    const completed = await handleCompleteLesson();
    if (completed) {
      const next = lessons[selectedLessonIndex + 1];
      if (next) {
        navigate(learnPath(courseId, next.id));
      }
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

  const lastLesson = lessons.length > 0 ? lessons[lessons.length - 1] : undefined;
  const lastLessonUnlock = lastLesson ? lessonUnlockById.get(lastLesson.id) : undefined;
  const isLastLessonUnlocked = Boolean(lastLessonUnlock?.isUnlocked);
  const isLastLesson = selectedLessonIndex === lessons.length - 1;

  const openAssignmentsLesson = () => {
    if (!lastLesson || !isLastLessonUnlocked || isNavigationLocked) {
      return;
    }

    setCurriculumOpen(false);
    handleSelectLesson(lastLesson.id);
  };

  const openExamLesson = () => {
    if (!pendingQuizLessonId || isNavigationLocked) {
      return;
    }

    setCurriculumOpen(false);
    handleSelectLesson(pendingQuizLessonId);
  };

  const curriculumPanel = (
    <CourseLearnCurriculum
      lessons={lessons}
      selectedLessonId={selectedLesson?.id}
      lessonProgressById={lessonProgressById}
      lessonUnlockById={lessonUnlockById}
      onSelectLesson={handleSelectLesson}
      isNavigationLocked={isNavigationLocked}
      assignmentCount={publishedAssignmentCount}
      lastLessonId={lastLesson?.id}
      assignmentsLabel={t("courseLearn.assignmentsTitle")}
      onOpenAssignments={openAssignmentsLesson}
      className="h-full"
    />
  );

  const shouldShowAssignmentPanel =
    canLearn && !isPreviewMode && publishedAssignmentCount > 0 && isLastLesson && !isLessonLocked;

  const progressPercentage = progressQuery.data?.percentage ?? 0;
  const completedLessons = progressQuery.data?.completedLessons ?? 0;
  const totalLessons = progressQuery.data?.totalLessons ?? lessons.length;
  const passedExams = progressQuery.data?.passedExams ?? 0;
  const totalExams = progressQuery.data?.totalExams ?? 0;
  const submittedAssignments = progressQuery.data?.submittedAssignments ?? 0;
  const totalAssignments = progressQuery.data?.totalAssignments ?? publishedAssignmentCount;
  const pendingAssignmentCount = Math.max(0, totalAssignments - submittedAssignments);
  const pendingExamCount = publishedCourseExams.length > 0 ? Math.max(0, publishedCourseExams.length - Math.min(passedExams, publishedCourseExams.length)) : 0;
  const isCourseComplete = Boolean(progressQuery.data?.isComplete);
  const showReviewBanner = canLearn && !isPreviewMode && isReviewSession && isCourseComplete;
  const showPendingAssignmentsBanner =
    canLearn && !isPreviewMode && !isCourseComplete && pendingAssignmentCount > 0;
  const showPendingExamsBanner = canLearn && !isPreviewMode && !isCourseComplete && publishedCourseExams.length > 0 && pendingExamCount > 0;

  return (
    <AppShell immersive title={course.title} subtitle={isPreviewMode ? t("coursePreview.subtitle") : t("courseLearn.subtitle")}>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-muted/20">
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

        <CourseLearnTopBar
          courseTitle={course.title}
          backHref={isPreviewMode ? `/courses/${courseId}` : "/dashboard"}
          backLabel={isPreviewMode ? t("coursePreview.backToStudio") : t("courseLearn.backToLearning")}
          progressPercentage={progressPercentage}
          completedLessons={completedLessons}
          totalLessons={totalLessons}
          passedExams={passedExams}
          totalExams={totalExams}
          submittedAssignments={submittedAssignments}
          totalAssignments={totalAssignments}
          isMobileCurriculumOpen={curriculumOpen}
          onToggleMobileCurriculum={() => setCurriculumOpen((current) => !current)}
          mobileCurriculumLabel={t("courseLearn.openCurriculum")}
          closeCurriculumLabel={t("courseLearn.closeCurriculum")}
        />

        {canLearn ? (
          <div className="shrink-0 space-y-2 border-b border-border/70 bg-background/80 px-4 py-2 sm:px-6">
            <ProgressOfflineSyncBanner pendingCount={pendingCount} isSyncing={isSyncing} onSyncNow={() => void flush()} />
            {showReviewBanner ? (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground">{t("courseLearn.reviewModeBanner")}</p>
                <Button asChild size="sm" variant="outline" className="h-9 shrink-0 rounded-xl shadow-none">
                  <Link to={`/courses/${courseId}/completed`}>{t("courseLearn.viewCertificate")}</Link>
                </Button>
              </div>
            ) : null}
            {showPendingAssignmentsBanner ? (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-amber-950 dark:text-amber-100">
                  {t("courseLearn.pendingAssignmentsBanner").replace("{count}", String(pendingAssignmentCount))}
                </p>
                {lastLesson && isLastLessonUnlocked ? (
                  <Button type="button" size="sm" className="h-9 shrink-0 rounded-xl shadow-none" onClick={openAssignmentsLesson}>
                    {t("courseLearn.openAssignments")}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {showPendingExamsBanner ? (
              <div className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-foreground">{t("courseLearn.pendingExamsBanner").replace("{count}", String(pendingExamCount))}</p>
                {pendingQuizLessonId ? (
                  <Button type="button" size="sm" className="h-9 shrink-0 rounded-xl shadow-none" onClick={openExamLesson}>
                    {t("courseLearn.openExam")}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-border/60 bg-background lg:block">
            <div className="sticky top-0 flex max-h-[calc(100dvh-3.5rem-3rem)] flex-col overflow-hidden">
              <div className="space-y-3 border-b border-border/60 px-4 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("courseLearn.curriculum")}</p>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    {completedLessons}/{totalLessons}
                  </span>
                </div>
                {!isPreviewMode ? (
                  <CourseProgressBar
                    percentage={progressPercentage}
                    completedLessons={completedLessons}
                    totalLessons={totalLessons}
                    passedExams={passedExams}
                    totalExams={totalExams}
                    submittedAssignments={submittedAssignments}
                    totalAssignments={totalAssignments}
                  />
                ) : null}
              </div>

              {lessonsQuery.isLoading ? (
                <div className="space-y-2 px-3 py-3">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="h-9 animate-pulse rounded-xl bg-muted/50" aria-hidden />
                  ))}
                </div>
              ) : lessons.length ? (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto py-2">{curriculumPanel}</div>
                  {!isPreviewMode ? <CourseGradeTimeline courseId={courseId} enabled={canLearn} className="shrink-0 px-2" /> : null}
                </>
              ) : (
                <div className="p-4">
                  <EmptyState icon={BookOpenText} title={t("courseLearn.noLessonsTitle")} description={t("courseLearn.noLessonsDescription")} />
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            {selectedLesson ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <CourseLearnLessonHeader
                      lessonNumber={selectedLessonIndex + 1}
                      totalLessons={lessons.length}
                      title={selectedLesson.title}
                      isCompleted={isLessonCompleted}
                      completedLabel={t("courseLearn.completed")}
                      className="mb-6"
                    />

                    {isLessonLocked ? (
                      <div className="rounded-2xl border border-border/70 bg-card px-6 py-10 text-center shadow-sm">
                        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                          <Lock className="size-5" aria-hidden />
                        </span>
                        <h2 className="mt-4 text-lg font-semibold text-foreground">{t("courseLearn.lessonLockedTitle")}</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                          {selectedUnlock?.lockedByLessonTitle
                            ? t("courseLearn.lessonLockedDescription").replace("{lesson}", selectedUnlock.lockedByLessonTitle)
                            : t("courseLearn.lessonLockedDescriptionGeneric")}
                        </p>
                        {selectedUnlock?.lockedByLessonId ? (
                          <Button
                            type="button"
                            className="mt-5 h-10 rounded-xl px-5 font-medium shadow-none"
                            onClick={() => handleSelectLesson(selectedUnlock.lockedByLessonId!)}
                          >
                            {t("courseLearn.goToPrerequisite")}
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                          <div className="p-5 sm:p-6 lg:p-8">
                            <LearnerLessonContent
                              lesson={selectedLesson}
                              courseId={courseId}
                              canAttemptQuiz={canLearn}
                              canAutoComplete={canLearn && !isLessonCompleted && !isLessonLocked}
                              watchPositionSeconds={selectedProgress?.watchPositionSeconds ?? 0}
                              onSaveWatchPosition={handleSaveWatchPosition}
                              onQuizGraded={() => {
                                void (async () => {
                                  await handleCompleteLesson();
                                  await progressQuery.refetch();
                                })();
                              }}
                              onAutoComplete={() => {
                                void handleCompleteLesson({ silent: true });
                              }}
                              resumeVideoLabel={t("courseLearn.resumeVideo")}
                            />
                          </div>
                        </article>

                        {canLearn && !isPreviewMode ? (
                          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                            <div className="border-b border-border/60 px-5 py-4 sm:px-6">
                              <h2 id="lesson-discussion-heading" className="text-base font-semibold tracking-tight text-foreground">
                                {t("courseLearn.discussionTitle")}
                              </h2>
                            </div>
                            <div className="p-5 sm:p-6">
                              <CourseDiscussionPanel
                                courseId={courseId}
                                lessonId={selectedLesson.id}
                                currentUserId={meQuery.data?.id}
                                currentUserEmail={meQuery.data?.email}
                                canParticipate={canLearn}
                              />
                            </div>
                          </section>
                        ) : null}

                        {shouldShowAssignmentPanel ? (
                          <LearnerAssignmentPanel
                            courseId={courseId}
                            enabled
                            onSubmitted={() => {
                              void progressQuery.refetch();
                            }}
                          />
                        ) : null}

                        {canLearn && !isPreviewMode && publishedAssignmentCount > 0 && !shouldShowAssignmentPanel ? (
                          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/15 px-5 py-4 text-sm text-muted-foreground">
                            {t("courseLearn.assignmentsLastLessonHint")}
                          </div>
                        ) : null}

                        {showLinkedLessonExercise && linkedLessonExercise ? (
                          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                            <div className="border-b border-border/60 px-5 py-4 sm:px-6">
                              <h2 className="text-base font-semibold tracking-tight text-foreground">{t("courseLearn.lessonExerciseTitle")}</h2>
                              <p className="mt-1 text-sm text-muted-foreground">{t("courseLearn.lessonExerciseDescription")}</p>
                            </div>
                            <div className="p-5 sm:p-6">
                              <LearnerQuizLesson
                                courseId={courseId}
                                examId={linkedLessonExercise.id}
                                canAttempt={canLearn}
                                onAttemptGraded={() => {
                                  void (async () => {
                                    await handleCompleteLesson({ silent: true });
                                    await progressQuery.refetch();
                                  })();
                                }}
                              />
                            </div>
                          </section>
                        ) : null}

                        {canLearn && !isPreviewMode && publishedCourseExams.length > 0 && !isQuizLesson && !showLinkedLessonExercise ? (
                          <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/5 px-5 py-4 text-sm text-muted-foreground">
                            {t("courseLearn.examsCourseHint")}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 sm:px-6 lg:px-8">
                  <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl shadow-none"
                        disabled={!previousUnlockedLesson || isNavigationLocked}
                        aria-disabled={!previousUnlockedLesson || isNavigationLocked}
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
                        className="h-10 rounded-xl shadow-none"
                        disabled={!nextUnlockedLesson || isNavigationLocked}
                        aria-disabled={!nextUnlockedLesson || isNavigationLocked}
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
                        className="h-10 min-w-[10rem] rounded-xl font-medium shadow-none"
                        disabled={isCompletingSelectedLesson || isNavigationLocked}
                        onClick={() => void handleCompleteAndContinue()}
                      >
                        {isCompletingSelectedLesson ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                            {t("courseLearn.savingProgress")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 size-4" aria-hidden />
                            {lessons[selectedLessonIndex + 1] ? t("courseLearn.completeAndContinue") : t("courseLearn.markComplete")}
                          </>
                        )}
                      </Button>
                    ) : !isPreviewMode && isLessonCompleted && nextUnlockedLesson && !isNavigationLocked ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-10 min-w-[10rem] rounded-xl font-medium shadow-none"
                        onClick={() => handleSelectLesson(nextUnlockedLesson.id)}
                      >
                        {t("courseLearn.nextLesson")}
                        <ChevronRight className="ml-1.5 size-4" aria-hidden />
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
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-background shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{t("courseLearn.curriculum")}</p>
                <Button type="button" variant="ghost" size="icon" className="size-9 rounded-xl" onClick={() => setCurriculumOpen(false)}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
              {!isPreviewMode ? (
                <div className="border-b border-border/60 px-4 py-3">
                  <CourseProgressBar
                    percentage={progressPercentage}
                    completedLessons={completedLessons}
                    totalLessons={totalLessons}
                    passedExams={passedExams}
                    totalExams={totalExams}
                    submittedAssignments={submittedAssignments}
                    totalAssignments={totalAssignments}
                  />
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto py-2">{curriculumPanel}</div>
              {!isPreviewMode ? <CourseGradeTimeline courseId={courseId} enabled={canLearn} className="shrink-0 px-2" /> : null}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
