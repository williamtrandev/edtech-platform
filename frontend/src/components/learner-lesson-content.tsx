import { useEffect, useRef } from "react";
import { LESSON_CONTENT_TYPE } from "../constants/business";
import { useI18n } from "../i18n";
import { parseLessonContent } from "../lib/lesson-content";
import { toMediaUrl } from "../lib/media-url";
import type { Lesson } from "../services/course.service";
import { LearnerLiveSessionLesson } from "./learner-live-session-lesson";
import { LearnerQuizLesson } from "./learner-quiz-lesson";

type LearnerLessonContentProps = {
  lesson: Lesson;
  courseId: string;
  canAttemptQuiz?: boolean;
  watchPositionSeconds?: number;
  onSaveWatchPosition?: (lessonId: string, watchPositionSeconds: number) => void;
  onQuizGraded?: () => void;
  resumeVideoLabel: string;
};

function LessonVideoPlayer({
  src,
  lessonId,
  initialPosition = 0,
  onSaveWatchPosition,
  resumeVideoLabel
}: {
  src: string;
  lessonId: string;
  initialPosition?: number;
  onSaveWatchPosition?: (lessonId: string, watchPositionSeconds: number) => void;
  resumeVideoLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedRef = useRef(0);
  const resumeAppliedRef = useRef(false);

  useEffect(() => {
    resumeAppliedRef.current = false;
    lastSavedRef.current = 0;
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
          if (position - lastSavedRef.current >= 5) {
            persistPosition();
          }
        }}
      />
    </div>
  );
}

export function LearnerLessonContent({
  lesson,
  courseId,
  canAttemptQuiz = false,
  watchPositionSeconds = 0,
  onSaveWatchPosition,
  onQuizGraded,
  resumeVideoLabel
}: LearnerLessonContentProps) {
  const { t } = useI18n();
  const parsed = parseLessonContent(lesson.content, lesson.contentType);

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

  if (parsed.kind === LESSON_CONTENT_TYPE.text && parsed.body) {
    return (
      <article
        className="prose prose-neutral dark:prose-invert max-w-none prose-base lg:prose-lg xl:prose-xl prose-headings:tracking-tight prose-p:leading-8 prose-li:leading-8 prose-pre:overflow-x-auto prose-img:rounded-xl"
        dangerouslySetInnerHTML={{ __html: parsed.body }}
      />
    );
  }

  if (parsed.kind === LESSON_CONTENT_TYPE.video && parsed.url) {
    return (
      <LessonVideoPlayer
        src={toMediaUrl(parsed.url)}
        lessonId={lesson.id}
        initialPosition={watchPositionSeconds}
        onSaveWatchPosition={onSaveWatchPosition}
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
