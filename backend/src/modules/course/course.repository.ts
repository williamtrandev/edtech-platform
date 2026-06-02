import { AssignmentStatus, AssignmentSubmissionStatus, CertificateStatus, CourseStatus, ExamAttemptStatus, ExamStatus, Prisma } from "@prisma/client";
import {
  AUDIT_ACTION,
  CERTIFICATE_HISTORY_EVENT,
  COURSE_ANALYTICS,
  LEARNER_INSIGHT_STATUS,
  type LearnerInsightStatus
} from "../../common/constants/analytics";
import { COURSE_COMPLETION_CRITERIA_TYPE } from "../../common/constants/progress";
import { prisma } from "../../config/prisma";

export type CourseListFilters = {
  category?: string;
  level?: string;
  language?: string;
  instructorId?: string;
  enrollment?: "all" | "enrolled" | "not-enrolled";
  learnerId?: string;
  sort?: "newest" | "oldest" | "popular" | "highest-rated" | "title";
};

export class CourseRepository {
  private readonly courseSelect = {
    id: true,
    title: true,
    description: true,
    category: true,
    level: true,
    language: true,
    durationMinutes: true,
    requirements: true,
    outcomes: true,
    coverImageUrl: true,
    ratingAverage: true,
    ratingCount: true,
    status: true,
    instructorId: true,
    instructor: {
      select: {
        id: true,
        email: true
      }
    },
    lockReason: true,
    lockedAt: true,
    lockedById: true,
    statusBeforeLock: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        enrollments: true
      }
    }
  } satisfies Prisma.CourseSelect;

  private mapCourse<T extends { _count: { enrollments: number } }>(course: T) {
    const { _count, ...data } = course;
    return {
      ...data,
      enrollmentCount: _count.enrollments
    };
  }

  async findMany(page: number, limit: number, status?: CourseStatus, search?: string, filters: CourseListFilters = {}) {
    const skip = (page - 1) * limit;
    const q = search?.trim();
    const enrollmentWhere =
      filters.learnerId && filters.enrollment === "enrolled"
        ? { enrollments: { some: { userId: filters.learnerId } } }
        : filters.learnerId && filters.enrollment === "not-enrolled"
          ? { enrollments: { none: { userId: filters.learnerId } } }
          : {};
    const where: Prisma.CourseWhereInput = {
      ...(status ? { status } : {}),
      ...(filters.category ? { category: { contains: filters.category, mode: "insensitive" } } : {}),
      ...(filters.level ? { level: { contains: filters.level, mode: "insensitive" } } : {}),
      ...(filters.language ? { language: { contains: filters.language, mode: "insensitive" } } : {}),
      ...(filters.instructorId ? { instructorId: filters.instructorId } : {}),
      ...enrollmentWhere,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    };
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      filters.sort === "oldest"
        ? { createdAt: "asc" }
        : filters.sort === "popular"
          ? { enrollments: { _count: "desc" } }
          : filters.sort === "highest-rated"
            ? { ratingAverage: "desc" }
            : filters.sort === "title"
              ? { title: "asc" }
              : { createdAt: "desc" };

    const [items, total] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: this.courseSelect,
        orderBy,
        skip,
        take: limit
      }),
      prisma.course.count({ where })
    ]);

    return { items: items.map((course) => this.mapCourse(course)), total };
  }

  async findById(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      select: this.courseSelect
    });
    return course ? this.mapCourse(course) : null;
  }

  async findFacets(status?: CourseStatus) {
    const where: Prisma.CourseWhereInput = {
      ...(status ? { status } : {})
    };

    const [metadataRows, instructorRows] = await prisma.$transaction([
      prisma.course.findMany({
        where,
        select: {
          category: true,
          level: true,
          language: true
        },
        distinct: ["category", "level", "language"]
      }),
      prisma.course.findMany({
        where,
        select: {
          instructor: {
            select: {
              id: true,
              email: true
            }
          }
        },
        distinct: ["instructorId"],
        orderBy: { instructorId: "asc" }
      })
    ]);

    const uniqueSorted = (values: Array<string | null>) =>
      Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) =>
        a.localeCompare(b)
      );

    return {
      categories: uniqueSorted(metadataRows.map((course) => course.category)),
      levels: uniqueSorted(metadataRows.map((course) => course.level)),
      languages: uniqueSorted(metadataRows.map((course) => course.language)),
      instructors: instructorRows
        .map((row) => row.instructor)
        .sort((a, b) => a.email.localeCompare(b.email))
    };
  }

  async countLessons(courseId: string) {
    return prisma.lesson.count({
      where: { courseId, archivedAt: null }
    });
  }

  async getAnalytics(courseId: string) {
    const [
      enrollmentCount,
      lessonCount,
      completedLessonCount,
      activeLearners,
      certificatesIssued,
      examCount,
      examAttemptCount,
      gradedExamAttemptCount,
      assignmentCount,
      assignmentSubmissionCount,
      lateAssignmentSubmissionCount,
      course
    ] = await prisma.$transaction([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.lesson.count({ where: { courseId, archivedAt: null } }),
      prisma.lessonProgress.count({
        where: {
          isCompleted: true,
          lesson: { courseId, archivedAt: null }
        }
      }),
      prisma.lessonProgress.groupBy({
        by: ["userId"],
        where: {
          isCompleted: true,
          lesson: { courseId }
        },
        orderBy: {
          userId: "asc"
        },
        _count: { userId: true }
      }),
      prisma.certificate.count({ where: { courseId } }),
      prisma.exam.count({ where: { courseId } }),
      prisma.examAttempt.count({ where: { exam: { courseId } } }),
      prisma.examAttempt.count({ where: { exam: { courseId }, status: ExamAttemptStatus.GRADED } }),
      prisma.assignment.count({ where: { courseId } }),
      prisma.assignmentSubmission.count({ where: { assignment: { courseId } } }),
      prisma.assignmentSubmission.count({ where: { assignment: { courseId }, isLate: true } }),
      prisma.course.findUnique({
        where: { id: courseId },
        select: {
          ratingAverage: true,
          ratingCount: true
        }
      })
    ]);

    const progressSlots = enrollmentCount * lessonCount;
    const completionRate = progressSlots > 0 ? Math.round((completedLessonCount / progressSlots) * 100) : 0;
    const engagementRate = enrollmentCount > 0 ? Math.round((activeLearners.length / enrollmentCount) * 100) : 0;

    const [learnerInsights, certificateHistory] = await Promise.all([
      this.getLearnerInsights(courseId, lessonCount, enrollmentCount),
      this.getCertificateHistory(courseId)
    ]);

    return {
      courseId,
      enrollmentCount,
      lessonCount,
      completedLessonCount,
      activeLearnerCount: activeLearners.length,
      completionRate,
      engagementRate,
      certificatesIssued,
      examCount,
      examAttemptCount,
      gradedExamAttemptCount,
      assignmentCount,
      assignmentSubmissionCount,
      lateAssignmentSubmissionCount,
      ratingAverage: course?.ratingAverage ?? 0,
      ratingCount: course?.ratingCount ?? 0,
      completionCriteria: {
        type:
          examCount > 0 || assignmentCount > 0
            ? COURSE_COMPLETION_CRITERIA_TYPE.fullCourseRequirements
            : COURSE_COMPLETION_CRITERIA_TYPE.allLessonsCompleted,
        lessonCount,
        examCount,
        assignmentCount
      },
      learnerInsights,
      certificateHistory
    };
  }

  private daysSince(date: Date) {
    return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  }

  async getLearnerInsights(courseId: string, lessonCount: number, enrollmentCount: number) {
    if (enrollmentCount === 0) {
      return {
        inactiveCount: 0,
        stalledCount: 0,
        lowProgressCount: 0,
        items: [] as Array<{
          userId: string;
          email: string;
          enrolledAt: string;
          completedLessons: number;
          totalLessons: number;
          progressPercent: number;
          lastActivityAt: string | null;
          status: LearnerInsightStatus;
        }>
      };
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      select: {
        enrolledAt: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    const userIds = enrollments.map((enrollment) => enrollment.user.id);
    const inactivityCutoff = new Date(Date.now() - COURSE_ANALYTICS.inactivityDays * 24 * 60 * 60 * 1000);

    const [completedByUser, lastProgressByUser, lastSubmissionByUser] = await Promise.all([
      prisma.lessonProgress.groupBy({
        by: ["userId"],
        where: {
          userId: { in: userIds },
          isCompleted: true,
          lesson: { courseId }
        },
        _count: { lessonId: true }
      }),
      prisma.lessonProgress.groupBy({
        by: ["userId"],
        where: {
          userId: { in: userIds },
          lesson: { courseId }
        },
        _max: { updatedAt: true }
      }),
      prisma.assignmentSubmission.groupBy({
        by: ["userId"],
        where: {
          userId: { in: userIds },
          assignment: { courseId }
        },
        _max: { submittedAt: true }
      })
    ]);

    const completedMap = new Map(completedByUser.map((row) => [row.userId, row._count.lessonId]));
    const progressActivityMap = new Map(lastProgressByUser.map((row) => [row.userId, row._max.updatedAt]));
    const submissionActivityMap = new Map(lastSubmissionByUser.map((row) => [row.userId, row._max.submittedAt]));

    const items: Array<{
      userId: string;
      email: string;
      enrolledAt: string;
      completedLessons: number;
      totalLessons: number;
      progressPercent: number;
      lastActivityAt: string | null;
      status: LearnerInsightStatus;
      sortRank: number;
    }> = [];

    for (const enrollment of enrollments) {
      const userId = enrollment.user.id;
      const completedLessons = completedMap.get(userId) ?? 0;
      const progressPercent = lessonCount > 0 ? Math.round((completedLessons / lessonCount) * 100) : 0;
      const lastProgressAt = progressActivityMap.get(userId) ?? null;
      const lastSubmissionAt = submissionActivityMap.get(userId) ?? null;
      const lastActivityAt =
        lastProgressAt && lastSubmissionAt
          ? lastProgressAt > lastSubmissionAt
            ? lastProgressAt
            : lastSubmissionAt
          : lastProgressAt ?? lastSubmissionAt ?? null;
      const enrolledAt = enrollment.enrolledAt;
      const daysEnrolled = this.daysSince(enrolledAt);

      let status: LearnerInsightStatus | null = null;
      let sortRank = 99;

      if (
        (!lastActivityAt || lastActivityAt < inactivityCutoff) &&
        enrolledAt < inactivityCutoff &&
        completedLessons < lessonCount
      ) {
        status = LEARNER_INSIGHT_STATUS.inactive;
        sortRank = 0;
      } else if (completedLessons === 0 && daysEnrolled >= COURSE_ANALYTICS.stalledEnrollmentDays) {
        status = LEARNER_INSIGHT_STATUS.stalled;
        sortRank = 1;
      } else if (
        progressPercent < COURSE_ANALYTICS.lowProgressPercent &&
        daysEnrolled >= COURSE_ANALYTICS.stalledEnrollmentDays &&
        completedLessons < lessonCount
      ) {
        status = LEARNER_INSIGHT_STATUS.lowProgress;
        sortRank = 2;
      }

      if (!status) {
        continue;
      }

      items.push({
        userId,
        email: enrollment.user.email,
        enrolledAt: enrolledAt.toISOString(),
        completedLessons,
        totalLessons: lessonCount,
        progressPercent,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
        status,
        sortRank
      });
    }

    items.sort((a, b) => {
      if (a.sortRank !== b.sortRank) {
        return a.sortRank - b.sortRank;
      }
      return a.progressPercent - b.progressPercent;
    });

    const limited = items.slice(0, COURSE_ANALYTICS.maxLearnerInsights).map(({ sortRank: _sortRank, ...item }) => item);

    return {
      inactiveCount: items.filter((item) => item.status === LEARNER_INSIGHT_STATUS.inactive).length,
      stalledCount: items.filter((item) => item.status === LEARNER_INSIGHT_STATUS.stalled).length,
      lowProgressCount: items.filter((item) => item.status === LEARNER_INSIGHT_STATUS.lowProgress).length,
      items: limited
    };
  }

  async getCertificateHistory(courseId: string) {
    const [certificates, auditEvents] = await Promise.all([
      prisma.certificate.findMany({
        where: { courseId },
        select: {
          id: true,
          verificationCode: true,
          status: true,
          issuedAt: true,
          revokedAt: true,
          user: {
            select: {
              id: true,
              email: true
            }
          }
        }
      }),
      prisma.auditLog.findMany({
        where: {
          entityType: "Certificate",
          action: {
            in: [AUDIT_ACTION.certificateIssued, AUDIT_ACTION.certificateRevoked, AUDIT_ACTION.certificateRestored]
          },
          metadata: {
            path: ["courseId"],
            equals: courseId
          }
        },
        select: {
          id: true,
          action: true,
          entityId: true,
          createdAt: true,
          actor: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: COURSE_ANALYTICS.maxCertificateHistory
      })
    ]);

    type HistoryEvent = {
      id: string;
      certificateId: string;
      type: (typeof CERTIFICATE_HISTORY_EVENT)[keyof typeof CERTIFICATE_HISTORY_EVENT];
      occurredAt: string;
      learnerEmail: string;
      actorEmail: string | null;
      verificationCode?: string;
    };

    const events: HistoryEvent[] = [];

    for (const certificate of certificates) {
      events.push({
        id: `${certificate.id}-issued`,
        certificateId: certificate.id,
        type: CERTIFICATE_HISTORY_EVENT.issued,
        occurredAt: certificate.issuedAt.toISOString(),
        learnerEmail: certificate.user.email,
        actorEmail: null,
        verificationCode: certificate.verificationCode
      });

      if (certificate.revokedAt) {
        events.push({
          id: `${certificate.id}-revoked`,
          certificateId: certificate.id,
          type: CERTIFICATE_HISTORY_EVENT.revoked,
          occurredAt: certificate.revokedAt.toISOString(),
          learnerEmail: certificate.user.email,
          actorEmail: null,
          verificationCode: certificate.verificationCode
        });
      }
    }

    for (const audit of auditEvents) {
      const type =
        audit.action === AUDIT_ACTION.certificateIssued
          ? CERTIFICATE_HISTORY_EVENT.issued
          : audit.action === AUDIT_ACTION.certificateRevoked
            ? CERTIFICATE_HISTORY_EVENT.revoked
            : CERTIFICATE_HISTORY_EVENT.restored;

      if (type === CERTIFICATE_HISTORY_EVENT.issued) {
        const duplicate = events.some(
          (event) => event.certificateId === audit.entityId && event.type === CERTIFICATE_HISTORY_EVENT.issued
        );
        if (duplicate) {
          continue;
        }
      }

      if (type === CERTIFICATE_HISTORY_EVENT.revoked) {
        const duplicate = events.some(
          (event) => event.certificateId === audit.entityId && event.type === CERTIFICATE_HISTORY_EVENT.revoked
        );
        if (duplicate) {
          continue;
        }
      }

      events.push({
        id: audit.id,
        certificateId: audit.entityId,
        type,
        occurredAt: audit.createdAt.toISOString(),
        learnerEmail: "",
        actorEmail: audit.actor?.email ?? null
      });
    }

    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    const certificateEmailMap = new Map(certificates.map((certificate) => [certificate.id, certificate.user.email]));

    return events.slice(0, COURSE_ANALYTICS.maxCertificateHistory).map((event) => ({
      ...event,
      learnerEmail: event.learnerEmail || certificateEmailMap.get(event.certificateId) || ""
    }));
  }

  async create(data: Prisma.CourseCreateInput) {
    const course = await prisma.course.create({
      data,
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async update(id: string, data: Prisma.CourseUpdateInput) {
    const course = await prisma.course.update({
      where: { id },
      data,
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async assignInstructor(id: string, instructorId: string) {
    const course = await prisma.course.update({
      where: { id },
      data: {
        instructor: {
          connect: {
            id: instructorId
          }
        }
      },
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async archiveById(id: string) {
    const course = await prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.ARCHIVED,
        archivedAt: new Date()
      },
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async lockById(id: string, actorId: string, reason: string | null, statusBeforeLock: CourseStatus) {
    const course = await prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.LOCKED,
        lockReason: reason,
        lockedAt: new Date(),
        lockedById: actorId,
        statusBeforeLock
      },
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async unlockById(id: string) {
    const existing = await prisma.course.findUniqueOrThrow({
      where: { id },
      select: {
        statusBeforeLock: true
      }
    });

    const course = await prisma.course.update({
      where: { id },
      data: {
        status: existing.statusBeforeLock ?? CourseStatus.DRAFT,
        lockReason: null,
        lockedAt: null,
        lockedById: null,
        statusBeforeLock: null
      },
      select: this.courseSelect
    });
    return this.mapCourse(course);
  }

  async getArchiveImpact(courseId: string) {
    const [
      enrollments,
      lessons,
      publishedExams,
      publishedAssignments,
      activeCertificates,
      inProgressExamAttempts,
      submittedAssignmentSubmissions
    ] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.lesson.count({ where: { courseId } }),
      prisma.exam.count({ where: { courseId, status: ExamStatus.PUBLISHED } }),
      prisma.assignment.count({ where: { courseId, status: AssignmentStatus.PUBLISHED } }),
      prisma.certificate.count({ where: { courseId, status: CertificateStatus.ACTIVE } }),
      prisma.examAttempt.count({
        where: {
          exam: { courseId },
          status: ExamAttemptStatus.IN_PROGRESS
        }
      }),
      prisma.assignmentSubmission.count({
        where: {
          assignment: { courseId, status: AssignmentStatus.PUBLISHED },
          status: AssignmentSubmissionStatus.SUBMITTED
        }
      })
    ]);

    return {
      enrollments,
      lessons,
      publishedExams,
      publishedAssignments,
      activeCertificates,
      inProgressExamAttempts,
      submittedAssignmentSubmissions
    };
  }
}
