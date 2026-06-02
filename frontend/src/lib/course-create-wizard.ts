import type { I18nKey } from "../i18n";

export const COURSE_CREATE_STEP = {
  details: "details",
  lessons: "lessons",
  exams: "exams",
  assignments: "assignments",
  review: "review"
} as const;

export type CourseCreateStepId = (typeof COURSE_CREATE_STEP)[keyof typeof COURSE_CREATE_STEP];

export type CourseCreateStepDefinition = {
  id: CourseCreateStepId;
  labelKey: I18nKey;
  optional?: boolean;
};

export const COURSE_CREATE_STEPS: CourseCreateStepDefinition[] = [
  { id: COURSE_CREATE_STEP.details, labelKey: "courseStudio.stepDetails" },
  { id: COURSE_CREATE_STEP.lessons, labelKey: "courseStudio.stepLessons" },
  { id: COURSE_CREATE_STEP.exams, labelKey: "courseStudio.stepExams", optional: true },
  { id: COURSE_CREATE_STEP.assignments, labelKey: "courseStudio.stepAssignments", optional: true },
  { id: COURSE_CREATE_STEP.review, labelKey: "courseStudio.stepReview" }
];

export function getCourseCreateStepIndex(stepId: CourseCreateStepId) {
  return COURSE_CREATE_STEPS.findIndex((step) => step.id === stepId);
}

export function getNextCourseCreateStep(stepId: CourseCreateStepId): CourseCreateStepId | null {
  const index = getCourseCreateStepIndex(stepId);
  if (index < 0 || index >= COURSE_CREATE_STEPS.length - 1) {
    return null;
  }
  return COURSE_CREATE_STEPS[index + 1]?.id ?? null;
}

export function getPreviousCourseCreateStep(stepId: CourseCreateStepId): CourseCreateStepId | null {
  const index = getCourseCreateStepIndex(stepId);
  if (index <= 0) {
    return null;
  }
  return COURSE_CREATE_STEPS[index - 1]?.id ?? null;
}

export function isCourseCreateStepId(value: string | null | undefined): value is CourseCreateStepId {
  if (!value) {
    return false;
  }
  return COURSE_CREATE_STEPS.some((step) => step.id === value);
}
