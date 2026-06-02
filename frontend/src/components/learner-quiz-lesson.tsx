import { ClipboardCheck } from "lucide-react";
import { EXAM_STATUS } from "../constants/business";
import { useCourseExams } from "../hooks/use-exams";
import { useI18n } from "../i18n";
import { EmptyState } from "./empty-state";
import { LearnerExamAttemptPanel } from "./learner-exam-attempt-panel";

type LearnerQuizLessonProps = {
  courseId: string;
  examId: string;
  canAttempt: boolean;
  onAttemptGraded?: () => void;
};

export function LearnerQuizLesson({ courseId, examId, canAttempt, onAttemptGraded }: LearnerQuizLessonProps) {
  const { t } = useI18n();
  const examsQuery = useCourseExams(courseId, Boolean(courseId));
  const exam = examsQuery.data?.find((item) => item.id === examId);

  if (examsQuery.isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10" aria-hidden />;
  }

  if (examsQuery.isError || !exam) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("courseLearn.quizUnavailableTitle")}
        description={t("courseLearn.quizUnavailableDescription")}
      />
    );
  }

  if (exam.status === EXAM_STATUS.archived) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t("courseLearn.quizArchivedTitle")}
        description={t("courseLearn.quizArchivedDescription")}
      />
    );
  }

  return <LearnerExamAttemptPanel courseId={courseId} exam={exam} canAttempt={canAttempt} onAttemptGraded={onAttemptGraded} />;
}
