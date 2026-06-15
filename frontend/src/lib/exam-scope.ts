import { EXAM_SCOPE, type ExamScope } from "../constants/business";
import type { Exam } from "../services/exam.service";

export function isLessonScopedExam(exam: Pick<Exam, "scope">) {
  return exam.scope === EXAM_SCOPE.lesson;
}

export function isCourseScopedExam(exam: Pick<Exam, "scope">) {
  return exam.scope === EXAM_SCOPE.course;
}

export function findLessonScopedExam(exams: Exam[], lessonId: string) {
  return exams.find(
    (exam) => exam.scope === EXAM_SCOPE.lesson && exam.lessonId === lessonId && exam.status !== "ARCHIVED"
  );
}

export function filterExamsByScope(exams: Exam[], scope: ExamScope) {
  return exams.filter((exam) => exam.scope === scope);
}
