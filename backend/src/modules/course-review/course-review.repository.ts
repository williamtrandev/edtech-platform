import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class CourseReviewRepository {
  private readonly reviewSelect = {
    id: true,
    userId: true,
    courseId: true,
    rating: true,
    comment: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        email: true
      }
    }
  } satisfies Prisma.CourseReviewSelect;

  async findByCourseId(courseId: string, page: number, limit: number) {
    const where: Prisma.CourseReviewWhereInput = { courseId };
    const [items, total] = await prisma.$transaction([
      prisma.courseReview.findMany({
        where,
        select: this.reviewSelect,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.courseReview.count({ where })
    ]);

    return { items, total };
  }

  async upsertUserReview(userId: string, courseId: string, payload: { rating: number; comment?: string | null }) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.courseReview.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        },
        create: {
          userId,
          courseId,
          rating: payload.rating,
          comment: payload.comment
        },
        update: {
          rating: payload.rating,
          comment: payload.comment
        },
        select: this.reviewSelect
      });

      await this.refreshCourseRating(tx, courseId);
      return review;
    });
  }

  async deleteUserReview(userId: string, courseId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.courseReview.deleteMany({
        where: {
          userId,
          courseId
        }
      });
      await this.refreshCourseRating(tx, courseId);
    });
  }

  private async refreshCourseRating(tx: Prisma.TransactionClient, courseId: string) {
    const aggregate = await tx.courseReview.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { rating: true }
    });

    await tx.course.update({
      where: { id: courseId },
      data: {
        ratingAverage: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count.rating
      }
    });
  }
}
