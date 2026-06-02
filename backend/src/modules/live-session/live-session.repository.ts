import { LESSON_CONTENT_TYPE } from "../../common/constants/lesson-content";
import { prisma } from "../../config/prisma";

export class LiveSessionRepository {
  async findLiveSessionLessonsByCourseIds(courseIds: string[]) {
    if (courseIds.length === 0) {
      return [];
    }

    return prisma.lesson.findMany({
      where: {
        courseId: { in: courseIds },
        contentType: LESSON_CONTENT_TYPE.liveSession,
        archivedAt: null
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        content: true,
        sortOrder: true,
        course: {
          select: {
            id: true,
            title: true,
            status: true,
            instructorId: true
          }
        }
      },
      orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }]
    });
  }

  async findLiveSessionLessonsByCourseId(courseId: string) {
    return this.findLiveSessionLessonsByCourseIds([courseId]);
  }
}
