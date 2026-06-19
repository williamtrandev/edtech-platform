import { AssignmentStatus, AssignmentSubmissionStatus, CourseStatus, ExamAttemptStatus, ExamQuestionType, ExamStatus, LessonContentType, NotificationType, Prisma, PrismaClient, UserRole } from "@prisma/client";
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
const DEFAULT_ASSIGNMENTS_PER_COURSE = 2;
const DEFAULT_ASSIGNMENT_SUBMISSIONS_PER_COURSE = 4;
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
  writeLine("  SEED_ASSIGNMENTS_PER_COURSE=2");
  writeLine("  SEED_ASSIGNMENT_SUBMISSIONS_PER_COURSE=4");
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

/** Number of published exams per seeded course. A course is only complete (and earns a certificate) when ALL are passed. */
const EXAMS_PER_COURSE = Math.max(1, Number(process.env.SEED_EXAMS_PER_COURSE) || 2);

function examId(courseIndex: number, examNumber = 1): string {
  return `${courseId(courseIndex)}-exam-${padded(examNumber, 2)}`;
}

function questionId(courseIndex: number, examNumber: number, questionIndex: number): string {
  return `${examId(courseIndex, examNumber)}-question-${padded(questionIndex, 2)}`;
}

function attemptId(courseIndex: number, examNumber: number, learnerIndex: number): string {
  return `${examId(courseIndex, examNumber)}-attempt-${padded(learnerIndex)}`;
}

function answerId(courseIndex: number, examNumber: number, learnerIndex: number, questionIndex: number): string {
  return `${attemptId(courseIndex, examNumber, learnerIndex)}-answer-${padded(questionIndex, 2)}`;
}

function assignmentId(courseIndex: number, assignmentIndex: number): string {
  return `${courseId(courseIndex)}-assignment-${padded(assignmentIndex, 2)}`;
}

function assignmentSubmissionId(courseIndex: number, assignmentIndex: number, learnerIndex: number): string {
  return `${assignmentId(courseIndex, assignmentIndex)}-submission-${padded(learnerIndex)}`;
}

function enrollmentId(courseIndex: number, learnerIndex: number): string {
  return `${courseId(courseIndex)}-enroll-${padded(learnerIndex)}`;
}

function notificationId(courseIndex: number, learnerIndex: number, type: string): string {
  return `${courseId(courseIndex)}-notification-${type}-${padded(learnerIndex)}`;
}

function certificateId(courseIndex: number, learnerIndex: number): string {
  return `${courseId(courseIndex)}-certificate-${padded(learnerIndex)}`;
}

function certificateCode(courseIndex: number, learnerIndex: number): string {
  return `cert_seed_${padded(courseIndex)}_${padded(learnerIndex)}`;
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
  const blocks = [
    `<h2>Lesson ${lessonIndex}</h2>`,
    `<p>This seeded lesson belongs to course ${padded(courseIndex)}. It gives the editor and detail pages realistic text length for UI testing.</p>`,
    "<ul><li>Read the overview.</li><li>Review the example.</li><li>Mark progress when done.</li></ul>"
  ];

  // First lesson carries a real code block so Shiki highlighting has something to render.
  if (lessonIndex === 1) {
    blocks.push(
      "<p>Example: read two integers and print their sum.</p>",
      '<pre class="language-python"><code>def solve(line):\n    a, b = map(int, line.split())\n    return a + b\n\nprint(solve("2 3"))  # 5</code></pre>'
    );
  }

  return blocks.join("");
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

function buildAssignmentInstructions(courseIndex: number, assignmentIndex: number): string {
  const topic = topics[(courseIndex + assignmentIndex - 2) % topics.length];
  return [
    `Prepare a short ${topic.toLowerCase()} deliverable for course ${padded(courseIndex)}.`,
    "Submit a concise explanation, implementation link, and any tradeoffs you made.",
    "Use realistic content so instructor review screens can be tested."
  ].join("\n");
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
    prisma.notification.deleteMany({ where: { userId: { startsWith: SEED_PREFIX } } }),
    prisma.certificate.deleteMany({ where: { courseId: { in: courseIds } } }),
    prisma.assignmentSubmission.deleteMany({ where: { assignment: { courseId: { in: courseIds } } } }),
    prisma.assignment.deleteMany({ where: { courseId: { in: courseIds } } }),
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

type SeedCodeTest = { name: string; input: string; expectedOutput: string; hidden: boolean };
type SeedCodeExercise = {
  language: string;
  prompt: string;
  instructions: string;
  starterCode: string;
  solutionCode: string;
  tests: SeedCodeTest[];
};

/** Multi-language CODE exercises cycled across seeded courses (stdin/stdout, except SQL which is self-contained). */
const CODE_EXERCISES: SeedCodeExercise[] = [
  {
    language: "python",
    prompt: "Backend (Python): read two space-separated integers and print their sum.",
    instructions: "Read two space-separated integers from standard input and print their sum.",
    starterCode: "import sys\n\nline = sys.stdin.readline()\na, b = map(int, line.split())\n# TODO: print their sum\nprint(0)\n",
    solutionCode: "import sys\n\nline = sys.stdin.readline()\na, b = map(int, line.split())\nprint(a + b)\n",
    tests: [
      { name: "adds positives", input: "2 3", expectedOutput: "5", hidden: false },
      { name: "adds negatives", input: "-4 -6", expectedOutput: "-10", hidden: false },
      { name: "hidden large sum", input: "1000000 1", expectedOutput: "1000001", hidden: true }
    ]
  },
  {
    language: "javascript",
    prompt: "Frontend (JavaScript): read a line and print it reversed.",
    instructions: "Read one line from standard input and print the string reversed.",
    starterCode: "const s = require('fs').readFileSync(0, 'utf8').trim();\n// TODO: print the reversed string\nconsole.log(s);\n",
    solutionCode: "const s = require('fs').readFileSync(0, 'utf8').trim();\nconsole.log(s.split('').reverse().join(''));\n",
    tests: [
      { name: "reverses abc", input: "abc", expectedOutput: "cba", hidden: false },
      { name: "reverses hello", input: "hello", expectedOutput: "olleh", hidden: false },
      { name: "hidden palindrome", input: "racecar", expectedOutput: "racecar", hidden: true }
    ]
  },
  {
    language: "bash",
    prompt: "Shell (Bash): read a line and print it in upper case.",
    instructions: "Read one line from standard input and print it converted to upper case.",
    starterCode: "read line\n# TODO: print the line in upper case\necho \"$line\"\n",
    solutionCode: "read line\necho \"${line^^}\"\n",
    tests: [
      { name: "uppercases hello", input: "hello", expectedOutput: "HELLO", hidden: false },
      { name: "uppercases phrase", input: "go lang", expectedOutput: "GO LANG", hidden: false },
      { name: "hidden alnum", input: "abc123", expectedOutput: "ABC123", hidden: true }
    ]
  },
  {
    language: "python",
    prompt: "Backend (Python): read a list of numbers and print the maximum.",
    instructions: "Read space-separated integers from standard input and print the largest one.",
    starterCode: "nums = list(map(int, input().split()))\n# TODO: print the maximum value\nprint(0)\n",
    solutionCode: "nums = list(map(int, input().split()))\nprint(max(nums))\n",
    tests: [
      { name: "max of three", input: "3 1 4", expectedOutput: "4", hidden: false },
      { name: "max with negative", input: "-5 2 0", expectedOutput: "2", hidden: false },
      { name: "hidden single element", input: "42", expectedOutput: "42", hidden: true }
    ]
  },
  {
    language: "sql",
    prompt: "Database (SQL): list the names of users older than 30, ordered by name.",
    instructions: "Using the seeded `users` table in the starter, write a query returning the names of users older than 30, ordered by name.",
    starterCode:
      "CREATE TABLE users(name TEXT, age INTEGER);\nINSERT INTO users VALUES ('Alice', 34), ('Bob', 28), ('Carol', 41);\n-- TODO: select names of users older than 30, ordered by name\n",
    solutionCode:
      "CREATE TABLE users(name TEXT, age INTEGER);\nINSERT INTO users VALUES ('Alice', 34), ('Bob', 28), ('Carol', 41);\nSELECT name FROM users WHERE age > 30 ORDER BY name;\n",
    tests: [{ name: "older than 30", input: "", expectedOutput: "Alice\nCarol", hidden: false }]
  }
];

async function upsertCourseExamData(courseIndex: number, questionsPerExam: number): Promise<void> {
  for (let examNumber = 1; examNumber <= EXAMS_PER_COURSE; examNumber += 1) {
    const examTitle =
      EXAMS_PER_COURSE > 1 ? `Module ${examNumber} exam: ${buildTitle(courseIndex)}` : `Final check: ${buildTitle(courseIndex)}`;

    await prisma.exam.upsert({
      where: { id: examId(courseIndex, examNumber) },
      create: {
        id: examId(courseIndex, examNumber),
        courseId: courseId(courseIndex),
        title: examTitle,
        description: "Seeded exam for testing learner attempt UI and instructor question authoring.",
        status: ExamStatus.PUBLISHED,
        durationMinutes: 30,
        passingScore: 70
      },
      update: {
        title: examTitle,
        description: "Seeded exam for testing learner attempt UI and instructor question authoring.",
        status: ExamStatus.PUBLISHED,
        archivedAt: null,
        durationMinutes: 30,
        passingScore: 70
      }
    });

    for (let questionIndex = 1; questionIndex <= questionsPerExam; questionIndex += 1) {
      const type = questionIndex === questionsPerExam ? ExamQuestionType.FREE_TEXT : ExamQuestionType.SINGLE_CHOICE;
      const questionFields = {
        type,
        prompt: buildQuestionPrompt(courseIndex, questionIndex),
        options: type === ExamQuestionType.FREE_TEXT ? [] : buildQuestionOptions(courseIndex, questionIndex),
        correctAnswers: type === ExamQuestionType.FREE_TEXT ? [] : ["A"],
        explanation: type === ExamQuestionType.FREE_TEXT ? "Manual grading required." : "Seed answer uses the documented pattern.",
        points: type === ExamQuestionType.FREE_TEXT ? 3 : 1,
        sortOrder: questionIndex
      };
      await prisma.examQuestion.upsert({
        where: { id: questionId(courseIndex, examNumber, questionIndex) },
        create: { id: questionId(courseIndex, examNumber, questionIndex), examId: examId(courseIndex, examNumber), ...questionFields },
        update: questionFields
      });
    }

    // CODE question: public config in `codeConfig`, secret (solution + hidden tests) in `correctAnswers`.
    // Exercise language differs per exam so a multi-exam course spans languages.
    const codeQuestionIndex = questionsPerExam + 1;
    const exercise = CODE_EXERCISES[(courseIndex + examNumber - 2) % CODE_EXERCISES.length];
    const codeConfig: Prisma.InputJsonValue = {
      language: exercise.language,
      starterCode: exercise.starterCode,
      instructions: exercise.instructions,
      sampleTests: exercise.tests.filter((test) => !test.hidden).map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }))
    };
    const codeSecret: Prisma.InputJsonValue = {
      solutionCode: exercise.solutionCode,
      tests: exercise.tests
    };
    const codeQuestionFields = {
      type: ExamQuestionType.CODE,
      prompt: exercise.prompt,
      options: [] as Prisma.InputJsonValue,
      correctAnswers: codeSecret,
      codeConfig,
      explanation: "Auto-graded by running your code against the test cases.",
      points: 5,
      sortOrder: codeQuestionIndex
    };
    await prisma.examQuestion.upsert({
      where: { id: questionId(courseIndex, examNumber, codeQuestionIndex) },
      create: { id: questionId(courseIndex, examNumber, codeQuestionIndex), examId: examId(courseIndex, examNumber), ...codeQuestionFields },
      update: codeQuestionFields
    });
  }
}

async function upsertCourseAssignmentData(courseIndex: number, assignmentsPerCourse: number): Promise<void> {
  for (let assignmentIndex = 1; assignmentIndex <= assignmentsPerCourse; assignmentIndex += 1) {
    await prisma.assignment.upsert({
      where: { id: assignmentId(courseIndex, assignmentIndex) },
      create: {
        id: assignmentId(courseIndex, assignmentIndex),
        courseId: courseId(courseIndex),
        title: `Assignment ${assignmentIndex}: ${topics[(courseIndex + assignmentIndex - 2) % topics.length]}`,
        instructions: buildAssignmentInstructions(courseIndex, assignmentIndex),
        status: AssignmentStatus.PUBLISHED,
        dueAt: new Date(Date.now() + (courseIndex + assignmentIndex) * 86400000),
        maxScore: 100,
        attachmentUrl: `https://example.test/assignments/${courseId(courseIndex)}/${assignmentIndex}.pdf`
      },
      update: {
        title: `Assignment ${assignmentIndex}: ${topics[(courseIndex + assignmentIndex - 2) % topics.length]}`,
        instructions: buildAssignmentInstructions(courseIndex, assignmentIndex),
        status: AssignmentStatus.PUBLISHED,
        archivedAt: null,
        dueAt: new Date(Date.now() + (courseIndex + assignmentIndex) * 86400000),
        maxScore: 100,
        attachmentUrl: `https://example.test/assignments/${courseId(courseIndex)}/${assignmentIndex}.pdf`
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

async function upsertCourses(courseCount: number, lessonsPerCourse: number, questionsPerExam: number, assignmentsPerCourse: number): Promise<void> {
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

    // Practice CODE_EXERCISE lesson (all sample tests visible; auto-completes on all-pass).
    const codeLessonExercise = CODE_EXERCISES[(index - 1) % CODE_EXERCISES.length];
    const codeLessonContent = JSON.stringify({
      version: 1,
      kind: LessonContentType.CODE_EXERCISE,
      language: codeLessonExercise.language,
      starterCode: codeLessonExercise.starterCode,
      instructions: codeLessonExercise.instructions,
      codeTests: codeLessonExercise.tests
        .filter((test) => !test.hidden)
        .map(({ name, input, expectedOutput }) => ({ name, input, expectedOutput }))
    });
    const codeLessonFields = {
      title: `Practice: ${codeLessonExercise.language} exercise`,
      contentType: LessonContentType.CODE_EXERCISE,
      content: codeLessonContent,
      sortOrder: lessonsPerCourse + 1
    };
    await prisma.lesson.upsert({
      where: { id: lessonId(index, lessonsPerCourse + 1) },
      create: { id: lessonId(index, lessonsPerCourse + 1), courseId: courseId(index), ...codeLessonFields },
      update: codeLessonFields
    });

    await upsertCourseExamData(index, questionsPerExam);
    await upsertCourseAssignmentData(index, assignmentsPerCourse);
  }
}

async function seedAssignmentSubmissions(courseCount: number, learnerCount: number, assignmentsPerCourse: number, submissionsPerCourse: number): Promise<number> {
  let seeded = 0;

  for (let courseIndex = 1; courseIndex <= courseCount; courseIndex += 1) {
    for (let assignmentIndex = 1; assignmentIndex <= assignmentsPerCourse; assignmentIndex += 1) {
      for (let offset = 0; offset < submissionsPerCourse; offset += 1) {
        const learnerIndex = ((courseIndex * 7 + offset * 3) % learnerCount) + 1;
        const graded = offset % 2 === 0;
        await prisma.assignmentSubmission.upsert({
          where: {
            assignmentId_userId: {
              assignmentId: assignmentId(courseIndex, assignmentIndex),
              userId: learnerId(learnerIndex)
            }
          },
          create: {
            id: assignmentSubmissionId(courseIndex, assignmentIndex, learnerIndex),
            assignmentId: assignmentId(courseIndex, assignmentIndex),
            userId: learnerId(learnerIndex),
            content: `Seed learner ${padded(learnerIndex)} submission for assignment ${assignmentIndex}.`,
            attachmentUrl: `https://example.test/submissions/${courseId(courseIndex)}/${learnerId(learnerIndex)}.md`,
            status: graded ? AssignmentSubmissionStatus.GRADED : AssignmentSubmissionStatus.SUBMITTED,
            score: graded ? 82 + (offset % 12) : null,
            feedback: graded ? "Seed feedback: clear structure and acceptable tradeoff notes." : null,
            gradedAt: graded ? new Date() : null
          },
          update: {
            content: `Seed learner ${padded(learnerIndex)} submission for assignment ${assignmentIndex}.`,
            attachmentUrl: `https://example.test/submissions/${courseId(courseIndex)}/${learnerId(learnerIndex)}.md`,
            status: graded ? AssignmentSubmissionStatus.GRADED : AssignmentSubmissionStatus.SUBMITTED,
            score: graded ? 82 + (offset % 12) : null,
            feedback: graded ? "Seed feedback: clear structure and acceptable tradeoff notes." : null,
            gradedAt: graded ? new Date() : null
          }
        });

        seeded += 1;
      }
    }
  }

  return seeded;
}

async function seedNotifications(courseCount: number, learnerCount: number): Promise<number> {
  const rows = [];

  for (let courseIndex = 1; courseIndex <= courseCount; courseIndex += 1) {
    const learnerIndex = ((courseIndex * 7) % learnerCount) + 1;
    rows.push({
      id: notificationId(courseIndex, learnerIndex, "enrolled"),
      userId: learnerId(learnerIndex),
      type: NotificationType.ENROLLMENT_SUCCESS,
      title: "Enrollment successful",
      body: `You are enrolled in ${buildTitle(courseIndex)}.`,
      linkUrl: `/courses/${courseId(courseIndex)}`,
      metadata: { courseId: courseId(courseIndex) }
    });
    rows.push({
      id: notificationId(courseIndex, learnerIndex, "assignment-graded"),
      userId: learnerId(learnerIndex),
      type: NotificationType.ASSIGNMENT_GRADED,
      title: "Assignment graded",
      body: `Assignment 1 in ${buildTitle(courseIndex)} was graded.`,
      linkUrl: `/courses/${courseId(courseIndex)}`,
      metadata: { courseId: courseId(courseIndex), assignmentId: assignmentId(courseIndex, 1) },
      readAt: courseIndex % 2 === 0 ? new Date() : null
    });
  }

  const result = await prisma.notification.createMany({
    data: rows,
    skipDuplicates: true
  });

  return result.count;
}

async function seedCertificates(courseCount: number, learnerCount: number): Promise<number> {
  let seeded = 0;

  for (let courseIndex = 1; courseIndex <= courseCount; courseIndex += 1) {
    if (courseIndex % 4 !== 0) {
      continue;
    }

    const learnerIndex = ((courseIndex * 7) % learnerCount) + 1;
    await prisma.certificate.upsert({
      where: {
        userId_courseId: {
          userId: learnerId(learnerIndex),
          courseId: courseId(courseIndex)
        }
      },
      create: {
        id: certificateId(courseIndex, learnerIndex),
        userId: learnerId(learnerIndex),
        courseId: courseId(courseIndex),
        verificationCode: certificateCode(courseIndex, learnerIndex)
      },
      update: {
        verificationCode: certificateCode(courseIndex, learnerIndex),
        status: "ACTIVE",
        revokedAt: null
      }
    });
    seeded += 1;
  }

  return seeded;
}

async function seedExamAttempts(courseCount: number, learnerCount: number, attemptsPerCourse: number, questionsPerExam: number): Promise<number> {
  let created = 0;

  for (let courseIndex = 1; courseIndex <= courseCount; courseIndex += 1) {
    for (let offset = 0; offset < attemptsPerCourse; offset += 1) {
      const learnerIndex = ((courseIndex * 7 + offset * 3) % learnerCount) + 1;

      for (let examNumber = 1; examNumber <= EXAMS_PER_COURSE; examNumber += 1) {
        const attempt = await prisma.examAttempt.upsert({
          where: {
            userId_examId_attemptNumber: {
              userId: learnerId(learnerIndex),
              examId: examId(courseIndex, examNumber),
              attemptNumber: 1
            }
          },
          create: {
            id: attemptId(courseIndex, examNumber, learnerIndex),
            userId: learnerId(learnerIndex),
            examId: examId(courseIndex, examNumber),
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
                questionId: questionId(courseIndex, examNumber, questionIndex)
              }
            },
            create: {
              id: answerId(courseIndex, examNumber, learnerIndex, questionIndex),
              attemptId: attempt.id,
              questionId: questionId(courseIndex, examNumber, questionIndex),
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
  const assignmentsPerCourse = parsePositiveInt("SEED_ASSIGNMENTS_PER_COURSE", DEFAULT_ASSIGNMENTS_PER_COURSE);
  const assignmentSubmissionsPerCourse = parsePositiveInt("SEED_ASSIGNMENT_SUBMISSIONS_PER_COURSE", DEFAULT_ASSIGNMENT_SUBMISSIONS_PER_COURSE);

  if (shouldReset) {
    await resetSeedData();
  }

  await upsertSeedUsers(learnerCount);
  await upsertCourses(courseCount, lessonsPerCourse, questionsPerExam, assignmentsPerCourse);
  const createdEnrollments = await seedEnrollments(courseCount, learnerCount);
  const seededAttempts = await seedExamAttempts(courseCount, learnerCount, attemptsPerCourse, questionsPerExam);
  const seededAssignmentSubmissions = await seedAssignmentSubmissions(courseCount, learnerCount, assignmentsPerCourse, assignmentSubmissionsPerCourse);
  const seededNotifications = await seedNotifications(courseCount, learnerCount);
  const seededCertificates = await seedCertificates(courseCount, learnerCount);

  writeLine("Seed courses complete.");
  writeLine(`Courses: ${courseCount}`);
  writeLine(`Lessons/course: ${lessonsPerCourse}`);
  writeLine(`Exams/course: ${EXAMS_PER_COURSE}`);
  writeLine(`Questions/exam: ${questionsPerExam}`);
  writeLine(`Assignments/course: ${assignmentsPerCourse}`);
  writeLine(`Learners: ${learnerCount}`);
  writeLine(`New enrollments: ${createdEnrollments}`);
  writeLine(`Seeded exam attempts: ${seededAttempts}`);
  writeLine(`Seeded assignment submissions: ${seededAssignmentSubmissions}`);
  writeLine(`Seeded notifications: ${seededNotifications}`);
  writeLine(`Seeded certificates: ${seededCertificates}`);
}

main()
  .catch((error: unknown) => {
    writeError(error instanceof Error ? error.message : "Failed to seed courses");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
