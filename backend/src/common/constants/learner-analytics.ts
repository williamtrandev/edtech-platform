export const LEARNER_ACTIVITY_TYPE = {
  enrollment: "ENROLLMENT",
  lessonCompleted: "LESSON_COMPLETED",
  examSubmitted: "EXAM_SUBMITTED",
  examGraded: "EXAM_GRADED",
  assignmentSubmitted: "ASSIGNMENT_SUBMITTED",
  assignmentGraded: "ASSIGNMENT_GRADED"
} as const;

export const LEARNER_GRADE_TYPE = {
  exam: "EXAM",
  assignment: "ASSIGNMENT"
} as const;

export const LEARNER_ANALYTICS_LIMITS = {
  recentActivity: 12,
  gradeHistory: 20,
  studyStreakLookbackDays: 60
} as const;
