import { Eye } from "lucide-react";
import { LESSON_CONTENT_TYPE } from "../constants/business";
import { parseLessonContent } from "../lib/lesson-content";
import { EmptyState } from "./empty-state";
import { LearnerLessonContent } from "./learner-lesson-content";
import type { Lesson } from "../services/course.service";

function hasRenderableLessonContent(lesson: Lesson) {
  const parsed = parseLessonContent(lesson.content, lesson.contentType);
  if (parsed.kind === LESSON_CONTENT_TYPE.text) {
    return Boolean(parsed.body?.trim());
  }
  if (parsed.kind === LESSON_CONTENT_TYPE.video || parsed.kind === LESSON_CONTENT_TYPE.resource) {
    return Boolean(parsed.url?.trim());
  }
  if (parsed.kind === LESSON_CONTENT_TYPE.quiz) {
    return Boolean(parsed.examId?.trim());
  }
  if (parsed.kind === LESSON_CONTENT_TYPE.liveSession) {
    return Boolean(parsed.meetingUrl?.trim() || parsed.startsAt?.trim() || parsed.instructions?.trim());
  }
  return false;
}

type CourseLessonPreviewPanelProps = {
  lesson: Lesson | null | undefined;
  courseId: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  contentEmptyTitle: string;
  contentEmptyDescription: string;
  resumeVideoLabel: string;
};

export function CourseLessonPreviewPanel({
  lesson,
  courseId,
  title,
  description,
  emptyTitle,
  emptyDescription,
  contentEmptyTitle,
  contentEmptyDescription,
  resumeVideoLabel
}: CourseLessonPreviewPanelProps) {
  return (
    <section className="rounded-2xl bg-muted/20 p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {!lesson ? (
        <EmptyState icon={Eye} title={emptyTitle} description={emptyDescription} />
      ) : !hasRenderableLessonContent(lesson) ? (
        <EmptyState icon={Eye} title={contentEmptyTitle} description={contentEmptyDescription} />
      ) : (
        <div className="min-h-[12rem] rounded-xl bg-background p-4 ring-1 ring-foreground/10">
          <LearnerLessonContent lesson={lesson} courseId={courseId} canAttemptQuiz={false} resumeVideoLabel={resumeVideoLabel} />
        </div>
      )}
    </section>
  );
}
