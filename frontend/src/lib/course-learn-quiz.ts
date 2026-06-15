import { EXAM_SCOPE, EXAM_STATUS, LESSON_CONTENT_TYPE } from "../constants/business";
import type { LessonUnlockMeta } from "./lesson-unlock";
import { parseLessonContent } from "./lesson-content";
import type { Lesson } from "../services/course.service";
import type { Exam } from "../services/exam.service";

function isLessonUnlocked(lessonId: string, lessonUnlockById: Map<string, LessonUnlockMeta>) {
  const unlock = lessonUnlockById.get(lessonId);
  return !unlock || unlock.isUnlocked;
}

export function findFirstUnlockedQuizLessonId(
  lessons: Lesson[],
  lessonUnlockById: Map<string, LessonUnlockMeta>,
  publishedExamIds?: ReadonlySet<string>,
  exams?: Exam[]
) {
  const publishedLessonExams = (exams ?? []).filter(
    (exam) => exam.status === EXAM_STATUS.published && exam.scope === EXAM_SCOPE.lesson && exam.lessonId
  );

  for (const lesson of lessons) {
    if (!isLessonUnlocked(lesson.id, lessonUnlockById)) {
      continue;
    }

    if (lesson.contentType === LESSON_CONTENT_TYPE.quiz) {
      const parsed = parseLessonContent(lesson.content, lesson.contentType);
      const examId = parsed.examId?.trim();
      if (!examId) {
        continue;
      }

      if (publishedExamIds && !publishedExamIds.has(examId)) {
        continue;
      }

      return lesson.id;
    }

    if (publishedLessonExams.some((exam) => exam.lessonId === lesson.id)) {
      return lesson.id;
    }
  }

  return null;
}
