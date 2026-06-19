import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LESSON_CONTENT_TYPE } from "../constants/business";
import { useI18n } from "../i18n";
import { parseLessonContent } from "../lib/lesson-content";
import { highlightLessonHtml } from "../lib/lesson-highlight";
import { toMediaUrl } from "../lib/media-url";
import type { Lesson } from "../services/course.service";
import { examService, type CodeGradingResult } from "../services/exam.service";
import { CodeExercise } from "./code-exercise";
import { LearnerLiveSessionLesson } from "./learner-live-session-lesson";
import { LearnerQuizLesson } from "./learner-quiz-lesson";

type LearnerLessonContentProps = {
  lesson: Lesson;
  courseId: string;
  canAttemptQuiz?: boolean;
  canAutoComplete?: boolean;
  watchPositionSeconds?: number;
  onSaveWatchPosition?: (lessonId: string, watchPositionSeconds: number) => void;
  onQuizGraded?: () => void;
  onAutoComplete?: () => void;
  resumeVideoLabel: string;
};

const LESSON_PROSE_CLASS =
  "lesson-prose prose prose-neutral dark:prose-invert max-w-none prose-base lg:prose-lg xl:prose-xl prose-headings:tracking-tight prose-p:leading-8 prose-li:leading-8 prose-pre:overflow-x-auto prose-img:rounded-xl";

/** Renders lesson HTML, swapping in Shiki-highlighted code blocks once ready. */
function LessonHtmlArticle({ html }: { html: string }) {
  const [rendered, setRendered] = useState(html);

  useEffect(() => {
    let active = true;
    setRendered(html);
    highlightLessonHtml(html)
      .then((next) => {
        if (active) {
          setRendered(next);
        }
      })
      .catch(() => {
        // Highlighting is progressive enhancement; keep the raw HTML on failure.
      });
    return () => {
      active = false;
    };
  }, [html]);

  return <article className={LESSON_PROSE_CLASS} dangerouslySetInnerHTML={{ __html: rendered }} />;
}

/** Practice coding exercise embedded in a lesson; runs vs sample tests and auto-completes on all-pass. */
function LessonCodeExercise({
  lessonId,
  language,
  starterCode,
  instructions,
  sampleTests,
  canComplete,
  onComplete
}: {
  lessonId: string;
  language: string;
  starterCode?: string;
  instructions?: string | null;
  sampleTests: Array<{ name: string; input: string; expectedOutput: string }>;
  canComplete: boolean;
  onComplete?: () => void;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState(starterCode ?? "");
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<CodeGradingResult | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    setCode(starterCode ?? "");
    setRunResult(null);
    completedRef.current = false;
  }, [lessonId, starterCode]);

  const onRun = async () => {
    setIsRunning(true);
    try {
      const result = await examService.runLessonCode(lessonId, code);
      setRunResult(result);
      if (result.allPassed && canComplete && !completedRef.current) {
        completedRef.current = true;
        onComplete?.();
        toast.success(t("courseLearn.codeExerciseSolved"));
      }
    } catch {
      toast.error(t("examAttempt.codeRunFailed"));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <CodeExercise
      language={language}
      value={code}
      onChange={setCode}
      instructions={instructions}
      sampleTests={sampleTests}
      onRun={() => void onRun()}
      isRunning={isRunning}
      runResult={runResult}
    />
  );
}

function LessonVideoPlayer({
  src,
  lessonId,
  initialPosition = 0,
  onSaveWatchPosition,
  onComplete,
  resumeVideoLabel
}: {
  src: string;
  lessonId: string;
  initialPosition?: number;
  onSaveWatchPosition?: (lessonId: string, watchPositionSeconds: number) => void;
  onComplete?: () => void;
  resumeVideoLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    resumeAppliedRef.current = false;
    lastSavedRef.current = 0;
    completedRef.current = false;
  }, [lessonId, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || resumeAppliedRef.current || initialPosition <= 0) {
      return;
    }

    const applyResume = () => {
      if (resumeAppliedRef.current || !video.duration || Number.isNaN(video.duration)) {
        return;
      }

      const safePosition = Math.min(initialPosition, Math.max(0, video.duration - 1));
      if (safePosition > 0) {
        video.currentTime = safePosition;
        lastSavedRef.current = Math.floor(safePosition);
        resumeAppliedRef.current = true;
      }
    };

    video.addEventListener("loadedmetadata", applyResume);
    applyResume();

    return () => {
      video.removeEventListener("loadedmetadata", applyResume);
    };
  }, [initialPosition, lessonId, src]);

  const persistPosition = () => {
    const video = videoRef.current;
    if (!video || !onSaveWatchPosition) {
      return;
    }

    const position = Math.floor(video.currentTime);
    if (position === lastSavedRef.current) {
      return;
    }

    lastSavedRef.current = position;
    onSaveWatchPosition(lessonId, position);
  };

  return (
    <div className="space-y-2">
      {initialPosition > 0 ? <p className="text-xs text-muted-foreground">{resumeVideoLabel}</p> : null}
      <video
        ref={videoRef}
        controls
        className="w-full rounded-xl bg-black ring-1 ring-foreground/10"
        src={src}
        onPause={persistPosition}
        onTimeUpdate={() => {
          const video = videoRef.current;
          if (!video) {
            return;
          }

          const position = Math.floor(video.currentTime);
          if (position - lastSavedRef.current >= 15) {
            persistPosition();
          }
        }}
        onEnded={() => {
          persistPosition();
          if (completedRef.current) {
            return;
          }
          completedRef.current = true;
          onComplete?.();
        }}
      />
    </div>
  );
}

export function LearnerLessonContent({
  lesson,
  courseId,
  canAttemptQuiz = false,
  canAutoComplete = false,
  watchPositionSeconds = 0,
  onSaveWatchPosition,
  onQuizGraded,
  onAutoComplete,
  resumeVideoLabel
}: LearnerLessonContentProps) {
  const { t } = useI18n();
  const parsed = parseLessonContent(lesson.content, lesson.contentType);
  const hasAutoCompletedRef = useRef(false);

  useEffect(() => {
    hasAutoCompletedRef.current = false;
  }, [lesson.id]);

  useEffect(() => {
    if (!canAutoComplete || hasAutoCompletedRef.current) {
      return;
    }

    const autoCompleteEligible =
      parsed.kind === LESSON_CONTENT_TYPE.text ||
      parsed.kind === LESSON_CONTENT_TYPE.resource ||
      parsed.kind === LESSON_CONTENT_TYPE.liveSession;

    if (!autoCompleteEligible) {
      return;
    }

    const timeout = window.setTimeout(() => {
      hasAutoCompletedRef.current = true;
      onAutoComplete?.();
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [canAutoComplete, onAutoComplete, parsed.kind]);

  if (parsed.kind === LESSON_CONTENT_TYPE.quiz && parsed.examId) {
    return (
      <LearnerQuizLesson
        courseId={courseId}
        examId={parsed.examId}
        canAttempt={canAttemptQuiz}
        onAttemptGraded={onQuizGraded}
      />
    );
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.liveSession) {
    return (
      <LearnerLiveSessionLesson
        content={parsed}
        joinSessionLabel={t("courseLearn.joinLiveSession")}
        scheduledLabel={t("courseLearn.liveSessionScheduled")}
        instructionsLabel={t("courseLearn.liveSessionInstructions")}
        noDetailsLabel={t("courseLearn.liveSessionEmpty")}
        statusLiveLabel={t("liveSessions.statusLive")}
        statusUpcomingLabel={t("liveSessions.statusUpcoming")}
        statusEndedLabel={t("liveSessions.statusEnded")}
        statusUnscheduledLabel={t("liveSessions.statusUnscheduled")}
      />
    );
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.codeExercise && parsed.language) {
    return (
      <LessonCodeExercise
        lessonId={lesson.id}
        language={parsed.language}
        starterCode={parsed.starterCode}
        instructions={parsed.instructions}
        sampleTests={parsed.codeTests ?? []}
        canComplete={canAutoComplete}
        onComplete={onAutoComplete}
      />
    );
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.text && parsed.body) {
    return <LessonHtmlArticle html={parsed.body} />;
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.video && parsed.url) {
    return (
      <LessonVideoPlayer
        src={toMediaUrl(parsed.url)}
        lessonId={lesson.id}
        initialPosition={watchPositionSeconds}
        onSaveWatchPosition={onSaveWatchPosition}
        onComplete={onAutoComplete}
        resumeVideoLabel={resumeVideoLabel}
      />
    );
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.resource && parsed.url) {
    return (
      <a
        className="inline-flex h-10 items-center rounded-md px-4 text-sm font-medium ring-1 ring-foreground/10 hover:bg-muted/40"
        href={toMediaUrl(parsed.url)}
        rel="noreferrer"
        target="_blank"
      >
        {parsed.fileName ?? parsed.url}
      </a>
    );
  }

  return null;
}
