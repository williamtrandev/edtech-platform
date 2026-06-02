import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class CourseDiscussionRepository {
  private readonly commentSelect = {
    id: true,
    courseId: true,
    lessonId: true,
    userId: true,
    parentId: true,
    body: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        email: true
      }
    },
    replies: {
      select: {
        id: true,
        courseId: true,
        lessonId: true,
        userId: true,
        parentId: true,
        body: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "asc" as const
      }
    }
  } satisfies Prisma.CourseDiscussionCommentSelect;

  async findTopLevelByCourse(courseId: string, lessonId: string | undefined, page: number, limit: number) {
    const where: Prisma.CourseDiscussionCommentWhereInput = {
      courseId,
      parentId: null,
      ...(lessonId ? { lessonId } : {})
    };

    const [items, total] = await prisma.$transaction([
      prisma.courseDiscussionComment.findMany({
        where,
        select: this.commentSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.courseDiscussionComment.count({ where })
    ]);

    return { items, total };
  }

  async findById(commentId: string) {
    return prisma.courseDiscussionComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        courseId: true,
        lessonId: true,
        userId: true,
        parentId: true,
        body: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  async createComment(payload: {
    courseId: string;
    lessonId?: string | null;
    userId: string;
    parentId?: string | null;
    body: string;
  }) {
    return prisma.courseDiscussionComment.create({
      data: {
        courseId: payload.courseId,
        lessonId: payload.lessonId ?? null,
        userId: payload.userId,
        parentId: payload.parentId ?? null,
        body: payload.body
      },
      select: this.commentSelect
    });
  }

  async deleteComment(commentId: string) {
    await prisma.courseDiscussionComment.delete({
      where: { id: commentId }
    });
  }
}
