import { AppError } from "../../common/errors/app-error";
import {
  LEARNER_ACTIVITY_TYPE,
  LEARNER_ANALYTICS_LIMITS,
  LEARNER_GRADE_TYPE
} from "../../common/constants/learner-analytics";
import { EXAM_ATTEMPT_STATUS, ASSIGNMENT_SUBMISSION_STATUS } from "../../common/constants/business";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { CourseProgressService } from "../progress/course-progress.service";
import { LearnerAnalyticsRepository } from "./learner-analytics.repository";

type ActivityItem = {
  id: string;
  type: (typeof LEARNER_ACTIVITY_TYPE)[keyof typeof LEARNER_ACTIVITY_TYPE];
  title: string;
  courseId: string;
  courseTitle: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

type GradeHistoryItem = {
  id: string;
  type: (typeof LEARNER_GRADE_TYPE)[keyof typeof LEARNER_GRADE_TYPE];
  title: string;
  courseId: string;
  courseTitle: string;
  score: number;
  maxScore: number | null;
  occurredAt: string;
  passed: boolean | null;
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function computeStudyStreak(completionDates: Date[]) {
  if (completionDates.length === 0) {
    return 0;
  }

  const dayKeys = new Set(completionDates.map((date) => startOfUtcDay(date).toISOString()));
  let streak = 0;
  const cursor = startOfUtcDay(new Date());

  while (dayKeys.has(cursor.toISOString())) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

function averageRounded(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export class LearnerAnalyticsService {
  constructor(
    private readonly learnerAnalyticsRepository: LearnerAnalyticsRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly courseProgressService: CourseProgressService
  ) {}

  async getMyAnalytics(user: Express.UserClaims | undefined) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const userId = user.id;
    const lookbackStart = new Date();
    lookbackStart.setUTCDate(lookbackStart.getUTCDate() - LEARNER_ANALYTICS_LIMITS.studyStreakLookbackDays);

    const [
      enrollments,
      lessonsCompleted,
      certificates,
      lessonDates,
      examRows,
      publishedExams,
      assignmentRows,
      gradeHistoryRows
    ] = await Promise.all([
      this.enrollmentRepository.findByUser(userId),
      this.learnerAnalyticsRepository.countCompletedLessons(userId),
      this.learnerAnalyticsRepository.countCertificates(userId),
      this.learnerAnalyticsRepository.findLessonCompletionDates(userId, lookbackStart),
      this.learnerAnalyticsRepository.findExamAssessmentRows(userId),
      this.learnerAnalyticsRepository.findPublishedExamsForUserCourses(userId),
      this.learnerAnalyticsRepository.findAssignmentAssessmentRows(userId),
      this.learnerAnalyticsRepository.findGradeHistoryRows(userId)
    ]);

    const enrollmentSnapshots = await Promise.all(
      enrollments.map(async (enrollment) => {
        const snapshot = await this.courseProgressService.getSnapshot(userId, enrollment.courseId);
        return {
          enrollmentId: enrollment.id,
          courseId: enrollment.courseId,
          courseTitle: enrollment.course?.title ?? enrollment.courseId,
          enrolledAt: enrollment.enrolledAt.toISOString(),
          progress: snapshot
        };
      })
    );

    let coursesInProgress = 0;
    let coursesCompleted = 0;
    let aggregatePassedExams = 0;
    let aggregateTotalExams = 0;
    let aggregateSubmittedAssignments = 0;
    let aggregateTotalAssignments = 0;

    for (const item of enrollmentSnapshots) {
      aggregatePassedExams += item.progress.passedExams;
      aggregateTotalExams += item.progress.totalExams;
      aggregateSubmittedAssignments += item.progress.submittedAssignments;
      aggregateTotalAssignments += item.progress.totalAssignments;

      if (item.progress.isComplete) {
        coursesCompleted += 1;
      } else if (item.progress.percentage > 0 || item.progress.completedLessons > 0) {
        coursesInProgress += 1;
      }
    }

    const gradedExamScores = examRows
      .filter((row) => row.status === EXAM_ATTEMPT_STATUS.graded && row.score !== null)
      .map((row) => row.score as number);

    const bestScoreByExam = new Map<string, number>();
    for (const row of examRows) {
      if (row.status !== EXAM_ATTEMPT_STATUS.graded || row.score === null) {
        continue;
      }

      const current = bestScoreByExam.get(row.exam.id);
      if (current === undefined || row.score > current) {
        bestScoreByExam.set(row.exam.id, row.score);
      }
    }

    const passedExamCount = publishedExams.filter((exam) => {
      const bestScore = bestScoreByExam.get(exam.id);
      if (bestScore === undefined) {
        return false;
      }

      return bestScore >= (exam.passingScore ?? 0);
    }).length;

    const gradedAssignmentScores = assignmentRows
      .filter((row) => row.status === ASSIGNMENT_SUBMISSION_STATUS.graded && row.score !== null)
      .map((row) => row.score as number);

    const pendingAssignmentGrades = assignmentRows.filter(
      (row) => row.status === ASSIGNMENT_SUBMISSION_STATUS.submitted
    ).length;

    const pendingExamGrades = examRows.filter((row) => row.status === EXAM_ATTEMPT_STATUS.submitted).length;

    const recentActivity = await this.buildRecentActivity(userId);
    const gradeHistory = this.buildGradeHistory(gradeHistoryRows);

    return {
      summary: {
        enrollments: enrollments.length,
        coursesInProgress,
        coursesCompleted,
        lessonsCompleted,
        certificates,
        studyStreakDays: computeStudyStreak(lessonDates.map((row) => row.completedAt))
      },
      assessments: {
        exams: {
          totalPublished: publishedExams.length,
          passed: passedExamCount,
          aggregatePassed: aggregatePassedExams,
          aggregateTotal: aggregateTotalExams,
          gradedAttempts: gradedExamScores.length,
          pendingGrades: pendingExamGrades,
          averageScore: averageRounded(gradedExamScores)
        },
        assignments: {
          submitted: assignmentRows.length,
          graded: gradedAssignmentScores.length,
          pendingGrades: pendingAssignmentGrades,
          aggregateSubmitted: aggregateSubmittedAssignments,
          aggregateTotal: aggregateTotalAssignments,
          averageScore: averageRounded(gradedAssignmentScores)
        }
      },
      enrollments: enrollmentSnapshots,
      recentActivity,
      gradeHistory
    };
  }

  async getMyCourseAnalytics(user: Express.UserClaims | undefined, courseId: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, courseId);
    if (!enrollment) {
      throw new AppError("Enrollment not found", 404, "ENROLLMENT_NOT_FOUND");
    }

    const userId = user.id;
    const [progress, examRows, assignmentRows, gradeHistoryRows, recentActivity] = await Promise.all([
      this.courseProgressService.getSnapshot(userId, courseId),
      this.learnerAnalyticsRepository.findExamAssessmentRows(userId),
      this.learnerAnalyticsRepository.findAssignmentAssessmentRows(userId),
      this.learnerAnalyticsRepository.findGradeHistoryRows(userId, LEARNER_ANALYTICS_LIMITS.gradeHistory, courseId),
      this.buildRecentActivity(userId)
    ]);

    const courseExamRows = examRows.filter((row) => row.exam.courseId === courseId);
    const courseAssignmentRows = assignmentRows.filter((row) => row.assignment.courseId === courseId);

    const gradedExamScores = courseExamRows
      .filter((row) => row.status === EXAM_ATTEMPT_STATUS.graded && row.score !== null)
      .map((row) => row.score as number);

    const gradedAssignmentScores = courseAssignmentRows
      .filter((row) => row.status === ASSIGNMENT_SUBMISSION_STATUS.graded && row.score !== null)
      .map((row) => row.score as number);

    const pendingExamGrades = courseExamRows.filter((row) => row.status === EXAM_ATTEMPT_STATUS.submitted).length;
    const pendingAssignmentGrades = courseAssignmentRows.filter(
      (row) => row.status === ASSIGNMENT_SUBMISSION_STATUS.submitted
    ).length;

    return {
      courseId,
      progress,
      assessments: {
        exams: {
          passed: progress.passedExams,
          total: progress.totalExams,
          pendingGrades: pendingExamGrades,
          averageScore: averageRounded(gradedExamScores)
        },
        assignments: {
          submitted: progress.submittedAssignments,
          total: progress.totalAssignments,
          graded: gradedAssignmentScores.length,
          pendingGrades: pendingAssignmentGrades,
          averageScore: averageRounded(gradedAssignmentScores)
        }
      },
      gradeHistory: this.buildGradeHistory(gradeHistoryRows, LEARNER_ANALYTICS_LIMITS.gradeHistory),
      recentActivity: recentActivity.filter((item) => item.courseId === courseId).slice(0, 8)
    };
  }

  private buildGradeHistory(
    rows: Awaited<ReturnType<LearnerAnalyticsRepository["findGradeHistoryRows"]>>,
    limit: number = LEARNER_ANALYTICS_LIMITS.gradeHistory
  ) {
    const items: GradeHistoryItem[] = [];

    for (const attempt of rows.examAttempts) {
      if (!attempt.gradedAt || attempt.score === null) {
        continue;
      }

      const passingScore = attempt.exam.passingScore ?? 0;
      items.push({
        id: attempt.id,
        type: LEARNER_GRADE_TYPE.exam,
        title: attempt.exam.title,
        courseId: attempt.exam.courseId,
        courseTitle: attempt.exam.course.title,
        score: attempt.score,
        maxScore: 100,
        occurredAt: attempt.gradedAt.toISOString(),
        passed: attempt.score >= passingScore
      });
    }

    for (const submission of rows.assignmentSubmissions) {
      if (!submission.gradedAt || submission.score === null) {
        continue;
      }

      items.push({
        id: submission.id,
        type: LEARNER_GRADE_TYPE.assignment,
        title: submission.assignment.title,
        courseId: submission.assignment.courseId,
        courseTitle: submission.assignment.course.title,
        score: submission.score,
        maxScore: submission.assignment.maxScore,
        occurredAt: submission.gradedAt.toISOString(),
        passed: null
      });
    }

    return items
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, limit);
  }

  private async buildRecentActivity(userId: string): Promise<ActivityItem[]> {
    const limit = LEARNER_ANALYTICS_LIMITS.recentActivity;
    const perSource = Math.ceil(limit / 2);

    const [enrollments, lessons, exams, assignments] = await Promise.all([
      this.learnerAnalyticsRepository.findRecentEnrollments(userId, perSource),
      this.learnerAnalyticsRepository.findRecentLessonCompletions(userId, perSource),
      this.learnerAnalyticsRepository.findRecentExamAttempts(userId, perSource),
      this.learnerAnalyticsRepository.findRecentAssignmentSubmissions(userId, perSource)
    ]);

    const items: ActivityItem[] = [];

    for (const enrollment of enrollments) {
      items.push({
        id: `enrollment-${enrollment.id}`,
        type: LEARNER_ACTIVITY_TYPE.enrollment,
        title: enrollment.course.title,
        courseId: enrollment.courseId,
        courseTitle: enrollment.course.title,
        occurredAt: enrollment.enrolledAt.toISOString()
      });
    }

    for (const lesson of lessons) {
      items.push({
        id: `lesson-${lesson.id}`,
        type: LEARNER_ACTIVITY_TYPE.lessonCompleted,
        title: lesson.lesson.title,
        courseId: lesson.lesson.courseId,
        courseTitle: lesson.lesson.course.title,
        occurredAt: lesson.completedAt.toISOString()
      });
    }

    for (const attempt of exams) {
      const isGraded = attempt.status === EXAM_ATTEMPT_STATUS.graded;
      const occurredAt = isGraded ? attempt.gradedAt : attempt.submittedAt;
      if (!occurredAt) {
        continue;
      }

      items.push({
        id: `exam-${attempt.id}-${isGraded ? "graded" : "submitted"}`,
        type: isGraded ? LEARNER_ACTIVITY_TYPE.examGraded : LEARNER_ACTIVITY_TYPE.examSubmitted,
        title: attempt.exam.title,
        courseId: attempt.exam.courseId,
        courseTitle: attempt.exam.course.title,
        occurredAt: occurredAt.toISOString(),
        metadata: attempt.score !== null ? { score: attempt.score } : undefined
      });
    }

    for (const submission of assignments) {
      const isGraded = submission.status === ASSIGNMENT_SUBMISSION_STATUS.graded;
      const occurredAt = isGraded ? submission.gradedAt : submission.submittedAt;
      if (!occurredAt) {
        continue;
      }

      items.push({
        id: `assignment-${submission.id}-${isGraded ? "graded" : "submitted"}`,
        type: isGraded ? LEARNER_ACTIVITY_TYPE.assignmentGraded : LEARNER_ACTIVITY_TYPE.assignmentSubmitted,
        title: submission.assignment.title,
        courseId: submission.assignment.courseId,
        courseTitle: submission.assignment.course.title,
        occurredAt: occurredAt.toISOString(),
        metadata: submission.score !== null ? { score: submission.score } : undefined
      });
    }

    return items
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, limit);
  }
}
