import {
  COURSE_COMPLETION_CRITERIA_TYPE,
  COURSE_PROGRESS_WEIGHTS,
  type CourseCompletionCriteriaType
} from "../../common/constants/progress";
import { resolveContinueLessonId } from "../../common/lesson-prerequisite/lesson-prerequisite";
import { ProgressRepository } from "./progress.repository";
import { CourseProgressRepository } from "./course-progress.repository";

type ProgressWeights = {
  lessons: number;
  exams: number;
  assignments: number;
};

export type CourseProgressSnapshot = {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
  totalAssignments: number;
  submittedAssignments: number;
  percentage: number;
  isComplete: boolean;
  completionCriteria: {
    type: CourseCompletionCriteriaType;
    lessonCount: number;
    examCount: number;
    assignmentCount: number;
  };
  breakdown: {
    lessonsPercent: number;
    examsPercent: number;
    assignmentsPercent: number;
    weights: ProgressWeights;
  };
};

export class CourseProgressService {
  constructor(
    private readonly progressRepository: ProgressRepository,
    private readonly courseProgressRepository: CourseProgressRepository
  ) {}

  async getSnapshot(userId: string, courseId: string): Promise<CourseProgressSnapshot> {
    const [totalLessons, completedLessons, totalLessonWeight, completedLessonWeight, totalExams, passedExams, totalAssignments, submittedAssignments] =
      await Promise.all([
        this.progressRepository.countCourseLessons(courseId),
        this.progressRepository.countCompletedCourseLessons(userId, courseId),
        this.progressRepository.sumCourseLessonProgressWeight(courseId),
        this.progressRepository.sumCompletedCourseLessonProgressWeight(userId, courseId),
        this.courseProgressRepository.countPublishedExams(courseId),
        this.courseProgressRepository.countPassedExamsForUser(userId, courseId),
        this.courseProgressRepository.countPublishedAssignments(courseId),
        this.courseProgressRepository.countSubmittedAssignmentsForUser(userId, courseId)
      ]);

    const cappedCompletedLessons = totalLessons > 0 ? Math.min(completedLessons, totalLessons) : 0;
    const cappedCompletedLessonWeight =
      totalLessonWeight > 0 ? Math.min(completedLessonWeight, totalLessonWeight) : 0;
    const lessonsPercent = this.segmentPercent(cappedCompletedLessonWeight, totalLessonWeight);
    const examsPercent = this.segmentPercent(passedExams, totalExams);
    const assignmentsPercent = this.segmentPercent(submittedAssignments, totalAssignments);
    const hasExamRequirement = totalExams > 0;
    const hasAssignmentRequirement = totalAssignments > 0;
    const useFullRequirements = hasExamRequirement || hasAssignmentRequirement;
    const weights = this.resolveProgressWeights(hasExamRequirement, hasAssignmentRequirement);
    const percentage = Math.min(
      100,
      Math.round(
        (lessonsPercent * weights.lessons + examsPercent * weights.exams + assignmentsPercent * weights.assignments) /
          100
      )
    );

    const lessonsDone = totalLessons === 0 || lessonsPercent >= 100;
    const examsDone = !hasExamRequirement || examsPercent >= 100;
    const assignmentsDone = !hasAssignmentRequirement || assignmentsPercent >= 100;
    const isComplete = lessonsDone && examsDone && assignmentsDone;

    return {
      courseId,
      totalLessons,
      completedLessons: cappedCompletedLessons,
      totalExams,
      passedExams,
      totalAssignments,
      submittedAssignments,
      percentage,
      isComplete,
      completionCriteria: {
        type: useFullRequirements
          ? COURSE_COMPLETION_CRITERIA_TYPE.fullCourseRequirements
          : COURSE_COMPLETION_CRITERIA_TYPE.allLessonsCompleted,
        lessonCount: totalLessons,
        examCount: totalExams,
        assignmentCount: totalAssignments
      },
      breakdown: {
        lessonsPercent,
        examsPercent,
        assignmentsPercent,
        weights
      }
    };
  }

  private resolveProgressWeights(hasExams: boolean, hasAssignments: boolean): ProgressWeights {
    if (hasExams && hasAssignments) {
      return COURSE_PROGRESS_WEIGHTS.full;
    }

    if (hasExams) {
      return COURSE_PROGRESS_WEIGHTS.lessonsAndExams;
    }

    if (hasAssignments) {
      return COURSE_PROGRESS_WEIGHTS.lessonsAndAssignments;
    }

    return COURSE_PROGRESS_WEIGHTS.lessonsOnly;
  }

  async getContinueLessonId(userId: string, courseId: string): Promise<string | null> {
    const [lessons, progressRows, completedLessonIds] = await Promise.all([
      this.progressRepository.findCourseLessonsForUnlock(courseId),
      this.progressRepository.findMyLessonProgressByCourse(userId, courseId),
      this.progressRepository.findCompletedLessonIdsByCourse(userId, courseId)
    ]);

    const progressByLessonId = new Map(
      progressRows.map((row) => [
        row.lessonId,
        {
          isCompleted: row.isCompleted,
          watchPositionSeconds: row.watchPositionSeconds
        }
      ])
    );

    return resolveContinueLessonId(lessons, progressByLessonId, completedLessonIds);
  }

  private segmentPercent(completed: number, total: number) {
    if (total === 0) {
      return 100;
    }

    return Math.min(100, Math.round((completed / total) * 100));
  }

}
