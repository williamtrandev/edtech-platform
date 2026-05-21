import { CourseStatus, ExamAttemptStatus, ExamQuestionType, ExamStatus, LessonContentType, Prisma, PrismaClient, UserRole } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});

const DEFAULT_COURSE_COUNT = 100;
const DEFAULT_LEARNER_COUNT = 48;
const DEFAULT_LESSONS_PER_COURSE = 4;
const DEFAULT_QUESTIONS_PER_EXAM = 5;
const DEFAULT_ATTEMPTS_PER_COURSE = 3;
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
const categories = ["Frontend", "Backend", "Database", "Product", "Testing"] as const;
const languages = ["English", "Vietnamese"] as const;

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
  writeLine("  SEED_QUESTIONS_PER_EXAM=5");
  writeLine("  SEED_ATTEMPTS_PER_COURSE=3");
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

function examId(courseIndex: number): string {
  return `${courseId(courseIndex)}-exam-01`;
}

function questionId(courseIndex: number, questionIndex: number): string {
  return `${examId(courseIndex)}-question-${padded(questionIndex, 2)}`;
}

function attemptId(courseIndex: number, learnerIndex: number): string {
  return `${examId(courseIndex)}-attempt-${padded(learnerIndex)}`;
}

function answerId(courseIndex: number, learnerIndex: number, questionIndex: number): string {
  return `${attemptId(courseIndex, learnerIndex)}-answer-${padded(questionIndex, 2)}`;
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

function buildRequirements(index: number): string {
  return [
    "Basic programming experience.",
    `A working development environment for dataset course ${padded(index)}.`,
    "Comfort reading short technical documentation."
  ].join("\n");
}

function buildOutcomes(index: number): string {
  const topic = topics[(index - 1) % topics.length];
  return [
    `Build a practical ${topic.toLowerCase()} workflow.`,
    "Explain the key implementation tradeoffs.",
    "Apply the pattern in a small production-style project."
  ].join("\n");
}

function buildLessonContent(courseIndex: number, lessonIndex: number): string {
  return [
    `<h2>Lesson ${lessonIndex}</h2>`,
    `<p>This seeded lesson belongs to course ${padded(courseIndex)}. It gives the editor and detail pages realistic text length for UI testing.</p>`,
    "<ul><li>Read the overview.</li><li>Review the example.</li><li>Mark progress when done.</li></ul>"
  ].join("");
}

function buildQuestionPrompt(courseIndex: number, questionIndex: number): string {
  const topic = topics[(courseIndex + questionIndex - 2) % topics.length];
  return `Course ${padded(courseIndex)} question ${questionIndex}: choose the best ${topic.toLowerCase()} decision.`;
}

function buildQuestionOptions(courseIndex: number, questionIndex: number): Prisma.InputJsonValue {
  return [
    { id: "A", text: `Use the documented course pattern ${padded(courseIndex)}.${questionIndex}.` },
    { id: "B", text: "Skip validation and patch data directly." },
    { id: "C", text: "Move business logic into UI components." },
    { id: "D", text: "Ignore role permissions for speed." }
  ];
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
    prisma.examAnswer.deleteMany({ where: { attempt: { examId: { startsWith: SEED_PREFIX } } } }),
    prisma.examAttempt.deleteMany({ where: { examId: { startsWith: SEED_PREFIX } } }),
    prisma.examQuestion.deleteMany({ where: { examId: { startsWith: SEED_PREFIX } } }),
    prisma.exam.deleteMany({ where: { id: { startsWith: SEED_PREFIX } } }),
    lessonIds.length
      ? prisma.lessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } })
      : prisma.lessonProgress.deleteMany({ where: { id: "__no_seed_lesson_progress__" } }),
    prisma.enrollment.deleteMany({ where: { courseId: { in: courseIds } } }),
    prisma.lesson.deleteMany({ where: { courseId: { in: courseIds } } }),
    prisma.course.deleteMany({ where: { id: { in: courseIds } } })
  ]);
}

async function upsertCourseExamData(courseIndex: number, questionsPerExam: number): Promise<void> {
  await prisma.exam.upsert({
    where: { id: examId(courseIndex) },
    create: {
      id: examId(courseIndex),
      courseId: courseId(courseIndex),
      title: `Final check: ${buildTitle(courseIndex)}`,
      description: "Seeded exam for testing learner attempt UI and instructor question authoring.",
      status: ExamStatus.PUBLISHED,
      durationMinutes: 30,
      passingScore: 70
    },
    update: {
      title: `Final check: ${buildTitle(courseIndex)}`,
      description: "Seeded exam for testing learner attempt UI and instructor question authoring.",
      status: ExamStatus.PUBLISHED,
      archivedAt: null,
      durationMinutes: 30,
      passingScore: 70
    }
  });

  for (let questionIndex = 1; questionIndex <= questionsPerExam; questionIndex += 1) {
    const type = questionIndex === questionsPerExam ? ExamQuestionType.FREE_TEXT : ExamQuestionType.SINGLE_CHOICE;
    await prisma.examQuestion.upsert({
      where: { id: questionId(courseIndex, questionIndex) },
      create: {
        id: questionId(courseIndex, questionIndex),
        examId: examId(courseIndex),
        type,
        prompt: buildQuestionPrompt(courseIndex, questionIndex),
        options: type === ExamQuestionType.FREE_TEXT ? [] : buildQuestionOptions(courseIndex, questionIndex),
        correctAnswers: type === ExamQuestionType.FREE_TEXT ? [] : ["A"],
        explanation: type === ExamQuestionType.FREE_TEXT ? "Manual grading required." : "Seed answer uses the documented pattern.",
        points: type === ExamQuestionType.FREE_TEXT ? 3 : 1,
        sortOrder: questionIndex
      },
      update: {
        type,
        prompt: buildQuestionPrompt(courseIndex, questionIndex),
        options: type === ExamQuestionType.FREE_TEXT ? [] : buildQuestionOptions(courseIndex, questionIndex),
        correctAnswers: type === ExamQuestionType.FREE_TEXT ? [] : ["A"],
        explanation: type === ExamQuestionType.FREE_TEXT ? "Manual grading required." : "Seed answer uses the documented pattern.",
        points: type === ExamQuestionType.FREE_TEXT ? 3 : 1,
        sortOrder: questionIndex
      }
    });
  }
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

async function upsertCourses(courseCount: number, lessonsPerCourse: number, questionsPerExam: number): Promise<void> {
  for (let index = 1; index <= courseCount; index += 1) {
    await prisma.course.upsert({
      where: { id: courseId(index) },
      create: {
        id: courseId(index),
        title: buildTitle(index),
        description: buildDescription(index),
        category: categories[(index - 1) % categories.length],
        level: levels[Math.floor((index - 1) / topics.length) % levels.length],
        language: languages[index % languages.length],
        durationMinutes: 180 + (index % 12) * 30,
        requirements: buildRequirements(index),
        outcomes: buildOutcomes(index),
        coverImageUrl: buildCoverImageUrl(index),
        status: CourseStatus.PUBLISHED,
        instructorId: INSTRUCTOR_ID
      },
      update: {
        title: buildTitle(index),
        description: buildDescription(index),
        category: categories[(index - 1) % categories.length],
        level: levels[Math.floor((index - 1) / topics.length) % levels.length],
        language: languages[index % languages.length],
        durationMinutes: 180 + (index % 12) * 30,
        requirements: buildRequirements(index),
        outcomes: buildOutcomes(index),
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

    await upsertCourseExamData(index, questionsPerExam);
  }
}

async function seedExamAttempts(courseCount: number, learnerCount: number, attemptsPerCourse: number, questionsPerExam: number): Promise<number> {
  let created = 0;

  for (let courseIndex = 1; courseIndex <= courseCount; courseIndex += 1) {
    for (let offset = 0; offset < attemptsPerCourse; offset += 1) {
      const learnerIndex = ((courseIndex * 7 + offset * 3) % learnerCount) + 1;
      const attempt = await prisma.examAttempt.upsert({
        where: {
          userId_examId_attemptNumber: {
            userId: learnerId(learnerIndex),
            examId: examId(courseIndex),
            attemptNumber: 1
          }
        },
        create: {
          id: attemptId(courseIndex, learnerIndex),
          userId: learnerId(learnerIndex),
          examId: examId(courseIndex),
          attemptNumber: 1,
          status: ExamAttemptStatus.SUBMITTED,
          submittedAt: new Date()
        },
        update: {
          status: ExamAttemptStatus.SUBMITTED,
          submittedAt: new Date()
        }
      });

      for (let questionIndex = 1; questionIndex <= questionsPerExam; questionIndex += 1) {
        const isFreeText = questionIndex === questionsPerExam;
        await prisma.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: questionId(courseIndex, questionIndex)
            }
          },
          create: {
            id: answerId(courseIndex, learnerIndex, questionIndex),
            attemptId: attempt.id,
            questionId: questionId(courseIndex, questionIndex),
            answer: isFreeText ? `Seed learner ${padded(learnerIndex)} written answer.` : "A"
          },
          update: {
            answer: isFreeText ? `Seed learner ${padded(learnerIndex)} written answer.` : "A"
          }
        });
      }

      created += 1;
    }
  }

  return created;
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
  const questionsPerExam = parsePositiveInt("SEED_QUESTIONS_PER_EXAM", DEFAULT_QUESTIONS_PER_EXAM);
  const attemptsPerCourse = parsePositiveInt("SEED_ATTEMPTS_PER_COURSE", DEFAULT_ATTEMPTS_PER_COURSE);

  if (shouldReset) {
    await resetSeedData();
  }

  await upsertSeedUsers(learnerCount);
  await upsertCourses(courseCount, lessonsPerCourse, questionsPerExam);
  const createdEnrollments = await seedEnrollments(courseCount, learnerCount);
  const seededAttempts = await seedExamAttempts(courseCount, learnerCount, attemptsPerCourse, questionsPerExam);

  writeLine("Seed courses complete.");
  writeLine(`Courses: ${courseCount}`);
  writeLine(`Lessons/course: ${lessonsPerCourse}`);
  writeLine(`Questions/exam: ${questionsPerExam}`);
  writeLine(`Learners: ${learnerCount}`);
  writeLine(`New enrollments: ${createdEnrollments}`);
  writeLine(`Seeded exam attempts: ${seededAttempts}`);
}

main()
  .catch((error: unknown) => {
    writeError(error instanceof Error ? error.message : "Failed to seed courses");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
