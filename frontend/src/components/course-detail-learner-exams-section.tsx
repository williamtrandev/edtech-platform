import { ClipboardCheck, PlayCircle } from "lucide-react";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EXAM_ATTEMPT_STATUS, EXAM_QUESTION_TYPE, EXAM_STATUS } from "../constants/business";
import { useI18n, type I18nKey } from "../i18n";
import { formatExamRemainingTime } from "../lib/exam-remaining-time";
import { LEARNER_CURRICULUM_GRID, STUDIO_LIST_STICKY, STUDIO_ROW, STUDIO_ROW_SELECTED, STUDIO_STAT } from "../lib/studio-layout";
import { cn } from "@/lib/utils";
import type { Exam, ExamAttemptSession } from "../services/exam.service";
import { EmptyState } from "./empty-state";
import { TextareaField } from "./textarea-field";

type CourseDetailLearnerExamsSectionProps = {
  exams: Exam[];
  activeExamSession: ExamAttemptSession | null;
  startingExamId: string | null;
  attemptAnswers: Record<string, string | string[]>;
  examRemainingSeconds: number | null;
  examAutosaveLabel: string;
  isSubmitting: boolean;
  workspaceRef: RefObject<HTMLDivElement>;
  scrollToWorkspace: () => void;
  onStartExam: (examId: string) => void;
  onChangeAttemptAnswer: (questionId: string, answer: string | string[]) => void;
  onToggleAttemptAnswer: (questionId: string, optionId: string) => void;
  onSubmitAttempt: () => void;
};

export function CourseDetailLearnerExamsSection({
  exams,
  activeExamSession,
  startingExamId,
  attemptAnswers,
  examRemainingSeconds,
  examAutosaveLabel,
  isSubmitting,
  workspaceRef,
  scrollToWorkspace,
  onStartExam,
  onChangeAttemptAnswer,
  onToggleAttemptAnswer,
  onSubmitAttempt
}: CourseDetailLearnerExamsSectionProps) {
  const { t } = useI18n();
  const activeExamId = activeExamSession?.exam.id ?? null;

  return (
    <section className={LEARNER_CURRICULUM_GRID}>
      <div className={cn(STUDIO_LIST_STICKY, "rounded-2xl bg-muted/20 p-4 ring-1 ring-foreground/10 sm:p-5")}>
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">{t("courseDetail.exams")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("courseDetail.learnerExamsHint")}</p>
        </div>

        {exams.length ? (
          <div className="grid gap-2">
            {exams.map((exam) => {
              const selected = activeExamId === exam.id;
              const isStarting = startingExamId === exam.id;
              const canStart = exam.status === EXAM_STATUS.published && (exam.questionCount ?? 0) > 0;
              const isAnotherStarting = startingExamId !== null && startingExamId !== exam.id;

              return (
                <article
                  key={exam.id}
                  className={cn(
                    STUDIO_ROW,
                    "flex-col items-stretch gap-3 sm:flex-row sm:items-center",
                    selected ? STUDIO_ROW_SELECTED : undefined
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-snug">{exam.title}</h3>
                    {exam.description ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{exam.description}</p>
                    ) : null}
                    <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {exam.durationMinutes ? (
                        <span className="rounded-md bg-background/80 px-2 py-0.5 ring-1 ring-foreground/10">
                          {exam.durationMinutes} {t("courseDetail.examMinutes")}
                        </span>
                      ) : null}
                      {exam.passingScore !== null && exam.passingScore !== undefined ? (
                        <span className="rounded-md bg-background/80 px-2 py-0.5 ring-1 ring-foreground/10">
                          {exam.passingScore}%
                        </span>
                      ) : null}
                      <span className="rounded-md bg-background/80 px-2 py-0.5 ring-1 ring-foreground/10">
                        {exam.questionCount ?? 0} {t("courseDetail.questions")}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="h-9 shrink-0 rounded-xl shadow-none"
                    disabled={!canStart || isStarting || isAnotherStarting}
                    onClick={() => {
                      if (selected && activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.inProgress) {
                        scrollToWorkspace();
                        return;
                      }
                      onStartExam(exam.id);
                    }}
                  >
                    {isStarting ? (
                      t("courseDetail.startingExam")
                    ) : selected && activeExamSession?.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? (
                      t("courseDetail.continueExam")
                    ) : (
                      <>
                        <PlayCircle className="mr-1.5 size-4" aria-hidden />
                        {t("courseDetail.startExam")}
                      </>
                    )}
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={ClipboardCheck} title={t("courseDetail.noExams")} description={t("courseDetail.noExamsDescription")} />
        )}
      </div>

      <div
        ref={workspaceRef}
        className="min-w-0 scroll-mt-24 rounded-2xl bg-card ring-1 ring-foreground/10 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
      >
        {activeExamSession ? (
          <div className="grid gap-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight">{activeExamSession.exam.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.graded
                    ? t("courseDetail.examGradedDescription")
                    : activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.submitted
                      ? t("courseDetail.examSubmittedDescription")
                      : t("courseDetail.examAttemptDescription")}
                </p>
              </div>
              <div className="grid justify-items-end gap-1">
                <Badge
                  variant={activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? "secondary" : "default"}
                  className="rounded-md"
                >
                  {t(`examAttemptStatus.${activeExamSession.attempt.status}` as I18nKey)}
                </Badge>
                {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? (
                  <span className="text-[11px] text-muted-foreground">{examAutosaveLabel}</span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:px-6">
              {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.graded &&
              activeExamSession.attempt.score !== null &&
              activeExamSession.attempt.score !== undefined ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className={STUDIO_STAT}>
                    <p className="text-xs text-muted-foreground">{t("courseDetail.examScore")}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{activeExamSession.attempt.score}%</p>
                  </div>
                  <div className={STUDIO_STAT}>
                    <p className="text-xs text-muted-foreground">{t("courseDetail.examPassingScore")}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{activeExamSession.exam.passingScore ?? "—"}%</p>
                  </div>
                  <div className={STUDIO_STAT}>
                    <p className="text-xs text-muted-foreground">{t("courseDetail.examAttempt")}</p>
                    <p className="mt-1 text-lg font-semibold">
                      {activeExamSession.exam.passingScore !== null &&
                      activeExamSession.exam.passingScore !== undefined &&
                      activeExamSession.attempt.score >= activeExamSession.exam.passingScore
                        ? t("courseDetail.examPassed")
                        : t("courseDetail.examFailed")}
                    </p>
                  </div>
                </div>
              ) : null}

              {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.submitted ? (
                <p className={cn(STUDIO_STAT, "text-sm text-muted-foreground")}>{t("courseDetail.examAwaitingManualGrade")}</p>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className={STUDIO_STAT}>
                  <p className="text-xs text-muted-foreground">{t("courseDetail.examAttempt")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">#{activeExamSession.attempt.attemptNumber}</p>
                </div>
                <div className={STUDIO_STAT}>
                  <p className="text-xs text-muted-foreground">{t("courseDetail.questions")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{activeExamSession.exam.questions.length}</p>
                </div>
                <div className={STUDIO_STAT}>
                  <p className="text-xs text-muted-foreground">{t("courseDetail.examDuration")}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {activeExamSession.exam.durationMinutes ? `${activeExamSession.exam.durationMinutes} ${t("courseDetail.examMinutes")}` : "—"}
                  </p>
                </div>
                <div className={STUDIO_STAT}>
                  <p className="text-xs text-muted-foreground">{t("courseDetail.examTimeRemaining")}</p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      examRemainingSeconds !== null && examRemainingSeconds <= 60 ? "text-destructive" : undefined
                    )}
                  >
                    {examRemainingSeconds === null ? "—" : formatExamRemainingTime(examRemainingSeconds)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {activeExamSession.exam.questions.map((question, index) => {
                  const answer = attemptAnswers[question.id];
                  const submitted = activeExamSession.attempt.status !== EXAM_ATTEMPT_STATUS.inProgress;

                  return (
                    <article key={question.id} className="rounded-xl bg-muted/30 px-4 py-4 ring-1 ring-foreground/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                        <Badge variant="outline" className="rounded-md">
                          {t(`examQuestionType.${question.type}` as I18nKey)}
                        </Badge>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {question.points} {t("courseDetail.points")}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold leading-6">{question.prompt}</h3>
                      {question.type === EXAM_QUESTION_TYPE.freeText ? (
                        <TextareaField
                          className="mt-3"
                          rows={5}
                          value={typeof answer === "string" ? answer : ""}
                          disabled={submitted}
                          onChange={(event) => onChangeAttemptAnswer(question.id, event.target.value)}
                          placeholder={t("courseDetail.freeTextAnswerPlaceholder")}
                        />
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {(question.options ?? []).map((option) => {
                            const checked =
                              question.type === EXAM_QUESTION_TYPE.singleChoice
                                ? answer === option.id
                                : Array.isArray(answer) && answer.includes(option.id);

                            return (
                              <button
                                key={option.id}
                                type="button"
                                disabled={submitted}
                                className={cn(
                                  "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left text-sm transition-[background-color,box-shadow,transform] duration-200",
                                  "ring-1 ring-foreground/10 hover:bg-background/80 active:scale-[0.99] motion-reduce:active:scale-100",
                                  "disabled:cursor-default disabled:opacity-70",
                                  checked ? "bg-background shadow-sm ring-2 ring-primary/25" : "bg-background/60"
                                )}
                                onClick={() => {
                                  if (question.type === EXAM_QUESTION_TYPE.singleChoice) {
                                    onChangeAttemptAnswer(question.id, option.id);
                                    return;
                                  }
                                  onToggleAttemptAnswer(question.id, option.id);
                                }}
                              >
                                <span
                                  className={cn(
                                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ring-1",
                                    checked ? "bg-primary ring-primary" : "ring-foreground/20"
                                  )}
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 leading-relaxed">
                                  <span className="font-medium">{option.id}.</span> {option.text}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {activeExamSession.attempt.status === EXAM_ATTEMPT_STATUS.inProgress ? (
                <div className="flex justify-end border-t border-border/60 pt-4">
                  <Button
                    className="h-10 rounded-xl shadow-none"
                    disabled={isSubmitting}
                    onClick={() => void onSubmitAttempt()}
                    type="button"
                  >
                    {isSubmitting ? t("courseDetail.submittingExam") : t("courseDetail.submitExam")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[16rem] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[20rem]">
            <div className="grid size-12 place-items-center rounded-2xl bg-muted/50 ring-1 ring-foreground/10">
              <ClipboardCheck className="size-5 text-muted-foreground" aria-hidden />
            </div>
            <h3 className="mt-4 text-base font-semibold tracking-tight">{t("courseDetail.learnerExamsWorkspaceTitle")}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{t("courseDetail.learnerExamsWorkspaceHint")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
