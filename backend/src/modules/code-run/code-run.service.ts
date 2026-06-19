import { ExamStatus } from "@prisma/client";
import { COURSE_STATUS, EXAM_QUESTION_TYPE } from "../../common/constants/business";
import { LESSON_CONTENT_TYPE, parseLessonContentPayload } from "../../common/constants/lesson-content";
import { AppError } from "../../common/errors/app-error";
import { CourseRepository } from "../course/course.repository";
import { EnrollmentRepository } from "../enrollment/enrollment.repository";
import { ExamAttemptRepository } from "../exam-attempt/exam-attempt.repository";
import { ExamQuestionRepository } from "../exam-question/exam-question.repository";
import { LessonRepository } from "../lesson/lesson.repository";
import { CodeGradingService } from "../code-execution/code-grading.service";

type CodeConfig = {
  language: string;
  sampleTests?: Array<{ name: string; input: string; expectedOutput: string }>;
};

/**
 * On-demand "Run" for a CODE question. Executes the learner's code against the
 * question's PUBLIC sample tests only (never the hidden tests) so it is a
 * practice preview — the real grade still runs the full suite on submit.
 */
export class CodeRunService {
  constructor(
    private readonly examQuestionRepository: ExamQuestionRepository,
    private readonly examAttemptRepository: ExamAttemptRepository,
    private readonly courseRepository: CourseRepository,
    private readonly enrollmentRepository: EnrollmentRepository,
    private readonly codeGradingService: CodeGradingService,
    private readonly lessonRepository: LessonRepository
  ) {}

  async runQuestionCode(user: Express.UserClaims | undefined, questionId: string, code: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const question = await this.examQuestionRepository.findById(questionId);
    if (!question) {
      throw new AppError("Question not found", 404, "EXAM_QUESTION_NOT_FOUND");
    }
    if (question.type !== EXAM_QUESTION_TYPE.code) {
      throw new AppError("Question is not a code question", 422, "EXAM_QUESTION_NOT_CODE");
    }

    const config = question.codeConfig as CodeConfig | null;
    const sampleTests = config?.sampleTests ?? [];
    if (!config?.language || sampleTests.length === 0) {
      throw new AppError("This question has no sample tests to run", 422, "CODE_NO_SAMPLE_TESTS");
    }

    const exam = await this.examAttemptRepository.findExamForAttempt(question.examId);
    if (!exam) {
      throw new AppError("Exam not found", 404, "EXAM_NOT_FOUND");
    }
    const course = await this.courseRepository.findById(exam.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.published || exam.status !== ExamStatus.PUBLISHED) {
      throw new AppError("Exam is not available", 403, "EXAM_NOT_AVAILABLE");
    }

    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, exam.courseId);
    if (!enrollment) {
      throw new AppError("Enroll in this course to run code", 403, "COURSE_ENROLLMENT_REQUIRED");
    }

    const result = await this.codeGradingService.gradeCodeQuestion({
      language: config.language,
      code,
      tests: sampleTests.map((test) => ({
        name: test.name,
        input: test.input,
        expectedOutput: test.expectedOutput,
        hidden: false
      }))
    });
    if (!result) {
      throw new AppError("Code execution is unavailable", 503, "CODE_EXECUTION_UNAVAILABLE");
    }

    return result;
  }

  /** Runs code for a lesson CODE_EXERCISE against its sample tests (all visible — practice). */
  async runLessonCode(user: Express.UserClaims | undefined, lessonId: string, code: string) {
    if (!user?.id) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new AppError("Lesson not found", 404, "LESSON_NOT_FOUND");
    }
    if (lesson.contentType !== LESSON_CONTENT_TYPE.codeExercise) {
      throw new AppError("Lesson is not a code exercise", 422, "LESSON_NOT_CODE_EXERCISE");
    }

    const payload = parseLessonContentPayload(lesson.content, lesson.contentType);
    const tests = payload.codeTests ?? [];
    if (!payload.language || tests.length === 0) {
      throw new AppError("This exercise has no tests to run", 422, "CODE_NO_SAMPLE_TESTS");
    }

    const course = await this.courseRepository.findById(lesson.courseId);
    if (!course) {
      throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
    }
    if (course.status !== COURSE_STATUS.published) {
      throw new AppError("Course is not available", 403, "COURSE_NOT_AVAILABLE");
    }
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(user.id, lesson.courseId);
    if (!enrollment) {
      throw new AppError("Enroll in this course to run code", 403, "COURSE_ENROLLMENT_REQUIRED");
    }

    const result = await this.codeGradingService.gradeCodeQuestion({
      language: payload.language,
      code,
      tests: tests.map((test) => ({ name: test.name, input: test.input, expectedOutput: test.expectedOutput, hidden: false }))
    });
    if (!result) {
      throw new AppError("Code execution is unavailable", 503, "CODE_EXECUTION_UNAVAILABLE");
    }

    return result;
  }
}
