import { CourseStatus, LessonContentType, PrismaClient, UserRole } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

const DEFAULT_COURSE_COUNT = 100;
const DEFAULT_LEARNER_COUNT = 48;
const DEFAULT_LESSONS_PER_COURSE = 4;
const SEED_PREFIX = "seed-lazy-course";
const INSTRUCTOR_ID = `${SEED_PREFIX}-instructor`;

const topics = [
  "React Foundation",
  "TypeScript Patterns",
  "Backend API Design",
  "PostgreSQL Practical",
  "Supabase Auth",
  "Course Builder UX",
  "Frontend Performance",
  "Node Service Layer",
  "Testing Strategy",
  "Product Analytics"
] as const;

const levels = ["Starter", "Core", "Applied", "Advanced", "Workshop"] as const;

function writeLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function showUsage(): void {
  writeLine("Seed many courses for catalog/lazy-loading tests.");
  writeLine("");
  writeLine("Env:");
  writeLine("  SUPABASE_DB_URL=<postgres-url>");
  writeLine("  SUPABASE_DIRECT_URL=<postgres-url>");
  writeLine("  SEED_COURSE_COUNT=100");
  writeLine("  SEED_LEARNER_COUNT=48");
  writeLine("  SEED_LESSONS_PER_COURSE=4");
  writeLine("");
  writeLine("Flags:");
  writeLine("  --reset    Delete previous seed courses/enrollments/lessons first");
  writeLine("");
  writeLine("Run:");
  writeLine("  npm run seed:courses");
}

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return value;
}

function padded(value: number, width = 3): string {
  return value.toString().padStart(width, "0");
}

function courseId(index: number): string {
  return `${SEED_PREFIX}-${padded(index)}`;
}

function learnerId(index: number): string {
  return `${SEED_PREFIX}-learner-${padded(index)}`;
}

function lessonId(courseIndex: number, lessonIndex: number): string {
  return `${courseId(courseIndex)}-lesson-${padded(lessonIndex, 2)}`;
}

function enrollmentId(courseIndex: number, learnerIndex: number): string {
  return `${courseId(courseIndex)}-enroll-${padded(learnerIndex)}`;
}

function buildTitle(index: number): string {
  const topic = topics[(index - 1) % topics.length];
  const level = levels[Math.floor((index - 1) / topics.length) % levels.length];
  return `${topic}: ${level} ${padded(index)}`;
}

function buildDescription(index: number): string {
  const topic = topics[(index - 1) % topics.length];
  return [
    `${topic} course seeded for catalog scale testing.`,
    "Use this data to validate image lazy loading, card layout stability, filtering, and enrollment count rendering.",
    `Dataset item ${padded(index)} is deterministic and safe to regenerate.`
  ].join(" ");
}

function buildCoverImageUrl(index: number): string {
  return `https://picsum.photos/seed/edtech-course-${padded(index)}/960/540`;
}

function buildLessonContent(courseIndex: number, lessonIndex: number): string {
  return [
    `<h2>Lesson ${lessonIndex}</h2>`,
    `<p>This seeded lesson belongs to course ${padded(courseIndex)}. It gives the editor and detail pages realistic text length for UI testing.</p>`,
    "<ul><li>Read the overview.</li><li>Review the example.</li><li>Mark progress when done.</li></ul>"
  ].join("");
}

async function resetSeedData(): Promise<void> {
  const seededCourses = await prisma.course.findMany({
    where: { id: { startsWith: SEED_PREFIX } },
    select: { id: true }
  });
  const courseIds = seededCourses.map((course) => course.id);

  if (courseIds.length === 0) {
    return;
  }

  const seededLessons = await prisma.lesson.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true }
  });
  const lessonIds = seededLessons.map((lesson) => lesson.id);

  await prisma.$transaction([
    lessonIds.length
      ? prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } })
      : prisma.lessonProgress.deleteMany({ where: { id: "__no_seed_lesson_progress__" } }),
    prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } }),
    prisma.lesson.deleteMany({ where: { courseId: { in: courseIds } } }),
    prisma.course.deleteMany({ where: { id: { in: courseIds } } })
  ]);
}

async function upsertSeedUsers(learnerCount: number): Promise<void> {
  await prisma.user.upsert({
    where: { id: INSTRUCTOR_ID },
    create: {
      id: INSTRUCTOR_ID,
      email: "seed.instructor@example.test",
      role: UserRole.INSTRUCTOR
    },
    update: {
      email: "seed.instructor@example.test",
      role: UserRole.INSTRUCTOR
    }
  });

  for (let index = 1; index <= learnerCount; index += 1) {
    await prisma.user.upsert({
      where: { id: learnerId(index) },
      create: {
        id: learnerId(index),
        email: `seed.learner.${padded(index)}@example.test`,
        role: UserRole.USER
      },
      update: {
        email: `seed.learner.${padded(index)}@example.test`,
        role: UserRole.USER
      }
    });
  }
}

async function upsertCourses(courseCount: number, lessonsPerCourse: number): Promise<void> {
  for (let index = 1; index <= courseCount; index += 1) {
    await prisma.course.upsert({
      where: { id: courseId(index) },
      create: {
        id: courseId(index),
        title: buildTitle(index),
        description: buildDescription(index),
        coverImageUrl: buildCoverImageUrl(index),
        status: CourseStatus.PUBLISHED,
        instructorId: INSTRUCTOR_ID
      },
      update: {
        title: buildTitle(index),
        description: buildDescription(index),
        coverImageUrl: buildCoverImageUrl(index),
        status: CourseStatus.PUBLISHED,
        archivedAt: null,
        instructorId: INSTRUCTOR_ID
      }
    });

    await prisma.lesson.createMany({
      data: Array.from({ length: lessonsPerCourse }, (_, lessonIndex) => ({
        id: lessonId(index, lessonIndex + 1),
        courseId: courseId(index),
        title: `Lesson ${lessonIndex + 1}: ${topics[(index + lessonIndex - 1) % topics.length]}`,
        contentType: LessonContentType.TEXT,
        content: buildLessonContent(index, lessonIndex + 1),
        sortOrder: lessonIndex + 1
      })),
      skipDuplicates: true
    });
  }
}

async function seedEnrollments(courseCount: number, learnerCount: number): Promise<number> {
  let created = 0;

  for (let courseIndex = 1; courseIndex <= courseCount; courseIndex += 1) {
    const enrollmentCount = 6 + (courseIndex % 17);
    const rows = Array.from({ length: enrollmentCount }, (_, offset) => {
      const learnerIndex = ((courseIndex * 7 + offset * 3) % learnerCount) + 1;
      return {
        id: enrollmentId(courseIndex, learnerIndex),
        courseId: courseId(courseIndex),
        userId: learnerId(learnerIndex)
      };
    });

    const result = await prisma.enrollment.createMany({
      data: rows,
      skipDuplicates: true
    });
    created += result.count;
  }

  return created;
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    showUsage();
    return;
  }

  const shouldReset = process.argv.includes("--reset");
  const courseCount = parsePositiveInt("SEED_COURSE_COUNT", DEFAULT_COURSE_COUNT);
  const learnerCount = parsePositiveInt("SEED_LEARNER_COUNT", DEFAULT_LEARNER_COUNT);
  const lessonsPerCourse = parsePositiveInt("SEED_LESSONS_PER_COURSE", DEFAULT_LESSONS_PER_COURSE);

  if (shouldReset) {
    await resetSeedData();
  }

  await upsertSeedUsers(learnerCount);
  await upsertCourses(courseCount, lessonsPerCourse);
  const createdEnrollments = await seedEnrollments(courseCount, learnerCount);

  writeLine("Seed courses complete.");
  writeLine(`Courses: ${courseCount}`);
  writeLine(`Lessons/course: ${lessonsPerCourse}`);
  writeLine(`Learners: ${learnerCount}`);
  writeLine(`New enrollments: ${createdEnrollments}`);
}

main()
  .catch((error: unknown) => {
    writeError(error instanceof Error ? error.message : "Failed to seed courses");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
