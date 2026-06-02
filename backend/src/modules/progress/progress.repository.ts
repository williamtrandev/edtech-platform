import { prisma } from "../../config/prisma";

export class ProgressRepository {
  async upsertLessonProgress(userId: string, lessonId: string, isCompleted: boolean) {
    return prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: {
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined
      },
      create: {
        user: { connect: { id: userId } },
        lesson: { connect: { id: lessonId } },
        isCompleted,
        completedAt: new Date()
      },
      select: {
        id: true,
        userId: true,
        lessonId: true,
        isCompleted: true,
        watchPositionSeconds: true,
        completedAt: true,
        updatedAt: true
      }
    });
  }

  async upsertWatchPosition(userId: string, lessonId: string, watchPositionSeconds: number) {
    return prisma.lessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId,
          lessonId
        }
      },
      update: {
        watchPositionSeconds
      },
      create: {
        user: { connect: { id: userId } },
        lesson: { connect: { id: lessonId } },
        isCompleted: false,
        watchPositionSeconds
      },
      select: {
        id: true,
        userId: true,
        lessonId: true,
        isCompleted: true,
        watchPositionSeconds: true,
        completedAt: true,
        updatedAt: true
      }
    });
  }

  async countCourseLessons(courseId: string) {
    return prisma.lesson.count({
      where: { courseId, archivedAt: null }
    });
  }

  async countCompletedCourseLessons(userId: string, courseId: string) {
    return prisma.lessonProgress.count({
      where: {
        userId,
        isCompleted: true,
        lesson: {
          courseId,
          archivedAt: null
        }
      }
    });
  }

  async countLessonTotalsByCourses(courseIds: string[]) {
    if (courseIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await prisma.lesson.groupBy({
      by: ["courseId"],
      where: { courseId: { in: courseIds }, archivedAt: null },
      _count: { _all: true }
    });

    return new Map(rows.map((row) => [row.courseId, row._count._all]));
  }

  async countCompletedLessonsByCourses(userId: string, courseIds: string[]) {
    if (courseIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await prisma.lessonProgress.findMany({
      where: {
        userId,
        isCompleted: true,
        lesson: { courseId: { in: courseIds }, archivedAt: null }
      },
      select: {
        lesson: { select: { courseId: true } }
      }
    });

    const totals = new Map<string, number>();
    for (const row of rows) {
      const courseId = row.lesson.courseId;
      totals.set(courseId, (totals.get(courseId) ?? 0) + 1);
    }

    return totals;
  }

  async findMyLessonProgressByCourse(userId: string, courseId: string) {
    return prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          courseId
        }
      },
      select: {
        lessonId: true,
        isCompleted: true,
        watchPositionSeconds: true,
        completedAt: true,
        updatedAt: true
      },
      orderBy: {
        lesson: {
          sortOrder: "asc"
        }
      }
    });
  }

  async findLessonById(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true,
        prerequisiteLessonId: true,
        archivedAt: true
      }
    });
  }

  async findCourseLessonsForUnlock(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId, archivedAt: null },
      select: {
        id: true,
        title: true,
        sortOrder: true,
        prerequisiteLessonId: true
      },
      orderBy: { sortOrder: "asc" }
    });
  }

  async findCompletedLessonIdsByCourse(userId: string, courseId: string) {
    const rows = await prisma.lessonProgress.findMany({
      where: {
        userId,
        isCompleted: true,
        lesson: { courseId }
      },
      select: { lessonId: true }
    });

    return new Set(rows.map((row) => row.lessonId));
  }
}
