export const COURSE_PROGRESS_SEGMENT = {
  lessons: "LESSONS",
  exams: "EXAMS",
  assignments: "ASSIGNMENTS"
} as const;

export const COURSE_PROGRESS_WEIGHTS = {
  lessonsOnly: { lessons: 100, exams: 0, assignments: 0 },
  lessonsAndExams: { lessons: 75, exams: 25, assignments: 0 },
  lessonsAndAssignments: { lessons: 85, exams: 0, assignments: 15 },
  full: { lessons: 60, exams: 25, assignments: 15 }
} as const;

export const COURSE_COMPLETION_CRITERIA_TYPE = {
  allLessonsCompleted: "ALL_LESSONS_COMPLETED",
  fullCourseRequirements: "FULL_COURSE_REQUIREMENTS"
} as const;

export type CourseCompletionCriteriaType = (typeof COURSE_COMPLETION_CRITERIA_TYPE)[keyof typeof COURSE_COMPLETION_CRITERIA_TYPE];
