import { AssignmentSubmissionStatus, CertificateStatus, CourseStatus, ExamAttemptStatus, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

function mapCounts<T extends string>(keys: readonly T[], rows: Array<{ key: T; count: number }>): Record<T, number> {
  const result = Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>;
  rows.forEach((row) => {
    result[row.key] = row.count;
  });
  return result;
}

function readGroupCount(row: { _count?: true | { _all?: number } }): number {
  return typeof row._count === "object" ? row._count._all ?? 0 : 0;
}

export class PlatformAnalyticsRepository {
  async getOverview() {
    const [
      userRoles,
      userStatuses,
      courseStatuses,
      enrollmentCount,
      lessonCount,
      completedLessonCount,
      examAttempts,
      assignmentSubmissions,
      lateAssignmentSubmissions,
      certificateStatuses,
      activeNotifications,
      auditLogCount
    ] = await prisma.$transaction([
      prisma.user.groupBy({
        by: ["role"],
        orderBy: { role: "asc" },
        _count: { _all: true }
      }),
      prisma.user.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true }
      }),
      prisma.course.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true }
      }),
      prisma.enrollment.count(),
      prisma.lesson.count(),
      prisma.lessonProgress.count({ where: { isCompleted: true } }),
      prisma.examAttempt.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true }
      }),
      prisma.assignmentSubmission.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true }
      }),
      prisma.assignmentSubmission.count({ where: { isLate: true } }),
      prisma.certificate.groupBy({
        by: ["status"],
        orderBy: { status: "asc" },
        _count: { _all: true }
      }),
      prisma.notification.count({ where: { readAt: null } }),
      prisma.auditLog.count()
    ]);

    const usersByRole = mapCounts(
      [UserRole.USER, UserRole.INSTRUCTOR, UserRole.ADMIN] as const,
      userRoles.map((row) => ({ key: row.role, count: readGroupCount(row) }))
    );
    const usersByStatus = mapCounts(
      [UserStatus.ACTIVE, UserStatus.SUSPENDED] as const,
      userStatuses.map((row) => ({ key: row.status, count: readGroupCount(row) }))
    );
    const coursesByStatus = mapCounts(
      [CourseStatus.DRAFT, CourseStatus.PUBLISHED, CourseStatus.ARCHIVED, CourseStatus.LOCKED] as const,
      courseStatuses.map((row) => ({ key: row.status, count: readGroupCount(row) }))
    );
    const examAttemptsByStatus = mapCounts(
      [ExamAttemptStatus.IN_PROGRESS, ExamAttemptStatus.SUBMITTED, ExamAttemptStatus.GRADED] as const,
      examAttempts.map((row) => ({ key: row.status, count: readGroupCount(row) }))
    );
    const assignmentSubmissionsByStatus = mapCounts(
      [AssignmentSubmissionStatus.SUBMITTED, AssignmentSubmissionStatus.GRADED] as const,
      assignmentSubmissions.map((row) => ({ key: row.status, count: readGroupCount(row) }))
    );
    const certificatesByStatus = mapCounts(
      [CertificateStatus.ACTIVE, CertificateStatus.REVOKED] as const,
      certificateStatuses.map((row) => ({ key: row.status, count: readGroupCount(row) }))
    );

    const userCount = Object.values(usersByRole).reduce((total, count) => total + count, 0);
    const courseCount = Object.values(coursesByStatus).reduce((total, count) => total + count, 0);
    const examAttemptCount = Object.values(examAttemptsByStatus).reduce((total, count) => total + count, 0);
    const assignmentSubmissionCount = Object.values(assignmentSubmissionsByStatus).reduce((total, count) => total + count, 0);
    const certificateCount = Object.values(certificatesByStatus).reduce((total, count) => total + count, 0);

    return {
      users: {
        total: userCount,
        byRole: usersByRole,
        byStatus: usersByStatus
      },
      courses: {
        total: courseCount,
        byStatus: coursesByStatus
      },
      learning: {
        enrollments: enrollmentCount,
        lessons: lessonCount,
        completedLessons: completedLessonCount,
        completionSignal: lessonCount > 0 && enrollmentCount > 0 ? Math.round((completedLessonCount / (lessonCount * enrollmentCount)) * 100) : 0
      },
      assessments: {
        examAttempts: examAttemptCount,
        examAttemptsByStatus,
        assignmentSubmissions: assignmentSubmissionCount,
        assignmentSubmissionsByStatus,
        lateAssignmentSubmissions
      },
      certificates: {
        total: certificateCount,
        byStatus: certificatesByStatus
      },
      operations: {
        unreadNotifications: activeNotifications,
        auditLogs: auditLogCount
      }
    };
  }
}
