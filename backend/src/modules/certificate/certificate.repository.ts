import { CertificateStatus, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export class CertificateRepository {
  private readonly certificateSelect = {
    id: true,
    userId: true,
    courseId: true,
    verificationCode: true,
    status: true,
    issuedAt: true,
    revokedAt: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        email: true
      }
    },
    course: {
      select: {
        id: true,
        title: true,
        instructor: {
          select: {
            id: true,
            email: true
          }
        }
      }
    }
  } satisfies Prisma.CertificateSelect;

  async findByUserAndCourse(userId: string, courseId: string) {
    return prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      },
      select: this.certificateSelect
    });
  }

  async findByUser(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      select: this.certificateSelect,
      orderBy: { issuedAt: "desc" }
    });
  }

  async findById(id: string) {
    return prisma.certificate.findUnique({
      where: { id },
      select: this.certificateSelect
    });
  }

  async findByCourse(courseId: string, page: number, limit: number, status?: CertificateStatus) {
    const where: Prisma.CertificateWhereInput = {
      courseId,
      ...(status ? { status } : {})
    };
    const [items, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: this.certificateSelect,
        orderBy: { issuedAt: "desc" }
      }),
      prisma.certificate.count({ where })
    ]);

    return { items, total };
  }

  async findCertificateCourseTitleSuggestions(query: string, limit: number) {
    const items = await prisma.certificate.findMany({
      where: {
        course: {
          title: {
            contains: query,
            mode: "insensitive"
          }
        }
      },
      distinct: ["courseId"],
      select: {
        course: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        issuedAt: "desc"
      },
      take: limit
    });

    return items
      .map((item) => item.course.title.trim())
      .filter((title) => title.length > 0);
  }

  async create(data: Prisma.CertificateCreateInput) {
    return prisma.certificate.create({
      data,
      select: this.certificateSelect
    });
  }

  async revoke(id: string) {
    return prisma.certificate.update({
      where: { id },
      data: {
        status: CertificateStatus.REVOKED,
        revokedAt: new Date()
      },
      select: this.certificateSelect
    });
  }

  async restore(id: string) {
    return prisma.certificate.update({
      where: { id },
      data: {
        status: CertificateStatus.ACTIVE,
        revokedAt: null
      },
      select: this.certificateSelect
    });
  }
}
