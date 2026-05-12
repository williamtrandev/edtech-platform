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
        completedAt: true,
        updatedAt: true
      }
    });
  }

  async countCourseLessons(courseId: string) {
    return prisma.lesson.count({
      where: { courseId }
    });
  }

  async countCompletedCourseLessons(userId: string, courseId: string) {
    return prisma.lessonProgress.count({
      where: {
        userId,
        isCompleted: true,
        lesson: {
          courseId
        }
      }
    });
  }

  async findLessonById(lessonId: string) {
    return prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        courseId: true
      }
    });
  }
}
