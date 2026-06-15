import { AssignmentStatus, ExamAttemptStatus, ExamScope, ExamStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class CourseProgressRepository {
  async countPublishedExams(courseId: string) {
    return prisma.exam.count({
      where: {
        courseId,
        status: ExamStatus.PUBLISHED
      }
    });
  }

  async countPublishedCourseScopedExams(courseId: string) {
    return prisma.exam.count({
      where: {
        courseId,
        status: ExamStatus.PUBLISHED,
        scope: ExamScope.COURSE
      }
    });
  }

  async countPublishedAssignments(courseId: string) {
    return prisma.assignment.count({
      where: {
        courseId,
        status: AssignmentStatus.PUBLISHED
      }
    });
  }

  async countPassedExamsForUser(userId: string, courseId: string, scope?: ExamScope) {
    const exams = await prisma.exam.findMany({
      where: {
        courseId,
        status: ExamStatus.PUBLISHED,
        ...(scope ? { scope } : {})
      },
      select: {
        id: true,
        passingScore: true
      }
    });

    if (exams.length === 0) {
      return 0;
    }

    const passedAttempts = await prisma.examAttempt.findMany({
      where: {
        userId,
        status: ExamAttemptStatus.GRADED,
        exam: {
          courseId,
          status: ExamStatus.PUBLISHED
        }
      },
      select: {
        examId: true,
        score: true
      }
    });

    const bestScoreByExam = new Map<string, number>();
    for (const attempt of passedAttempts) {
      const score = attempt.score ?? 0;
      const current = bestScoreByExam.get(attempt.examId);
      if (current === undefined || score > current) {
        bestScoreByExam.set(attempt.examId, score);
      }
    }

    return exams.filter((exam) => {
      const bestScore = bestScoreByExam.get(exam.id);
      if (bestScore === undefined) {
        return false;
      }

      const passingScore = exam.passingScore ?? 0;
      return bestScore >= passingScore;
    }).length;
  }

  async countSubmittedAssignmentsForUser(userId: string, courseId: string) {
    const publishedAssignments = await prisma.assignment.findMany({
      where: {
        courseId,
        status: AssignmentStatus.PUBLISHED
      },
      select: { id: true }
    });

    if (publishedAssignments.length === 0) {
      return 0;
    }

    const assignmentIds = publishedAssignments.map((assignment) => assignment.id);
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        userId,
        assignmentId: { in: assignmentIds }
      },
      select: {
        assignmentId: true
      }
    });

    return new Set(submissions.map((submission) => submission.assignmentId)).size;
  }
}
