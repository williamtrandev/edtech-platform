import { ExamAttemptStatus, ExamStatus, AssignmentSubmissionStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { LEARNER_ANALYTICS_LIMITS } from "../../common/constants/learner-analytics";
import { CERTIFICATE_STATUS } from "../../common/constants/business";

export class LearnerAnalyticsRepository {
  async countCompletedLessons(userId: string) {
    return prisma.lessonProgress.count({
      where: { userId, isCompleted: true }
    });
  }

  async countCertificates(userId: string) {
    return prisma.certificate.count({
      where: { userId, status: CERTIFICATE_STATUS.active }
    });
  }

  async findLessonCompletionDates(userId: string, since: Date) {
    return prisma.lessonProgress.findMany({
      where: {
        userId,
        isCompleted: true,
        completedAt: { gte: since }
      },
      select: { completedAt: true },
      orderBy: { completedAt: "desc" }
    });
  }

  async findExamAssessmentRows(userId: string) {
    return prisma.examAttempt.findMany({
      where: {
        userId,
        status: { in: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED] }
      },
      select: {
        id: true,
        status: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
            courseId: true,
            passingScore: true,
            course: { select: { title: true } }
          }
        }
      }
    });
  }

  async findPublishedExamsForUserCourses(userId: string) {
    return prisma.exam.findMany({
      where: {
        status: ExamStatus.PUBLISHED,
        course: {
          enrollments: { some: { userId } }
        }
      },
      select: {
        id: true,
        courseId: true,
        passingScore: true
      }
    });
  }

  async findAssignmentAssessmentRows(userId: string) {
    return prisma.assignmentSubmission.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            courseId: true,
            course: { select: { title: true } }
          }
        }
      }
    });
  }

  async findRecentEnrollments(userId: string, limit: number) {
    return prisma.enrollment.findMany({
      where: { userId },
      select: {
        id: true,
        courseId: true,
        enrolledAt: true,
        course: { select: { title: true } }
      },
      orderBy: { enrolledAt: "desc" },
      take: limit
    });
  }

  async findRecentLessonCompletions(userId: string, limit: number) {
    return prisma.lessonProgress.findMany({
      where: { userId, isCompleted: true },
      select: {
        id: true,
        completedAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { title: true } }
          }
        }
      },
      orderBy: { completedAt: "desc" },
      take: limit
    });
  }

  async findRecentExamAttempts(userId: string, limit: number) {
    return prisma.examAttempt.findMany({
      where: {
        userId,
        status: { in: [ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED] }
      },
      select: {
        id: true,
        status: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        exam: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: { select: { title: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: limit
    });
  }

  async findRecentAssignmentSubmissions(userId: string, limit: number) {
    return prisma.assignmentSubmission.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            maxScore: true,
            courseId: true,
            course: { select: { title: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: limit
    });
  }

  async findGradeHistoryRows(
    userId: string,
    limit: number = LEARNER_ANALYTICS_LIMITS.gradeHistory,
    courseId?: string
  ) {
    const [examAttempts, assignmentSubmissions] = await Promise.all([
      prisma.examAttempt.findMany({
        where: {
          userId,
          status: ExamAttemptStatus.GRADED,
          gradedAt: { not: null },
          ...(courseId ? { exam: { courseId } } : {})
        },
        select: {
          id: true,
          score: true,
          gradedAt: true,
          exam: {
            select: {
              id: true,
              title: true,
              courseId: true,
              passingScore: true,
              course: { select: { title: true } }
            }
          }
        },
        orderBy: { gradedAt: "desc" },
        take: limit
      }),
      prisma.assignmentSubmission.findMany({
        where: {
          userId,
          status: AssignmentSubmissionStatus.GRADED,
          gradedAt: { not: null },
          ...(courseId ? { assignment: { courseId } } : {})
        },
        select: {
          id: true,
          score: true,
          gradedAt: true,
          assignment: {
            select: {
              id: true,
              title: true,
              maxScore: true,
              courseId: true,
              course: { select: { title: true } }
            }
          }
        },
        orderBy: { gradedAt: "desc" },
        take: limit
      })
    ]);

    return { examAttempts, assignmentSubmissions };
  }
}
