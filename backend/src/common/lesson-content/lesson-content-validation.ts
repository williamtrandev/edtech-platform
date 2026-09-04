import { AppError } from "../errors/app-error";
import {
  LESSON_CODE_LIMITS,
  LESSON_CONTENT_ERROR_CODE,
  LESSON_CONTENT_TYPE,
  type LessonCodeTest,
  type LessonContentType,
  parseLessonContentPayload,
  serializeLessonContentPayload
} from "../constants/lesson-content";
import { CODE_QUESTION_LANGUAGES } from "../constants/business";
import type { ExamRepository } from "../../modules/exam/exam.repository";

/**
 * Validates the author-supplied tests for a CODE_EXERCISE lesson.
 *
 * `input` is preserved verbatim because it is piped to the program's stdin,
 * where leading and trailing whitespace is significant. An empty `input` is
 * allowed — a program that reads nothing is a legitimate exercise.
 * `expectedOutput` is trimmed to match the grader's output normalization.
 */
function validateLessonCodeTests(raw: LessonCodeTest[] | undefined): LessonCodeTest[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new AppError("Code exercise requires at least one test", 422, LESSON_CONTENT_ERROR_CODE.codeTestsRequired);
  }

  if (raw.length > LESSON_CODE_LIMITS.testsMax) {
    throw new AppError(
      `Code exercise allows at most ${LESSON_CODE_LIMITS.testsMax} tests`,
      422,
      LESSON_CONTENT_ERROR_CODE.codeTestInvalid
    );
  }

  return raw.map((test, index) => {
    const position = index + 1;
    const name = typeof test?.name === "string" ? test.name.trim() : "";
    const input = typeof test?.input === "string" ? test.input : "";
    const expectedOutput = typeof test?.expectedOutput === "string" ? test.expectedOutput.trim() : "";

    if (!name) {
      throw new AppError(`Test ${position} requires a name`, 422, LESSON_CONTENT_ERROR_CODE.codeTestInvalid);
    }

    if (name.length > LESSON_CODE_LIMITS.testNameMax) {
      throw new AppError(
        `Test ${position} name must be at most ${LESSON_CODE_LIMITS.testNameMax} characters`,
        422,
        LESSON_CONTENT_ERROR_CODE.codeTestInvalid
      );
    }

    if (!expectedOutput) {
      throw new AppError(`Test ${position} requires an expected output`, 422, LESSON_CONTENT_ERROR_CODE.codeTestInvalid);
    }

    if (input.length > LESSON_CODE_LIMITS.testIoMax || expectedOutput.length > LESSON_CODE_LIMITS.testIoMax) {
      throw new AppError(
        `Test ${position} input and expected output must each be at most ${LESSON_CODE_LIMITS.testIoMax} characters`,
        422,
        LESSON_CONTENT_ERROR_CODE.codeTestInvalid
      );
    }

    return { name, input, expectedOutput };
  });
}

type ValidateLessonContentInput = {
  courseId: string;
  contentType: LessonContentType;
  content: string;
};

export async function validateAndNormalizeLessonContent(
  examRepository: ExamRepository,
  input: ValidateLessonContentInput
): Promise<string> {
  const contentType = input.contentType;

  if (contentType === LESSON_CONTENT_TYPE.quiz) {
    const parsed = parseLessonContentPayload(input.content, contentType);
    const examId = parsed.examId?.trim();

    if (!examId) {
      throw new AppError("Quiz lesson requires a linked exam", 422, LESSON_CONTENT_ERROR_CODE.quizExamRequired);
    }

    const exam = await examRepository.findById(examId);
    if (!exam) {
      throw new AppError("Linked exam not found", 404, LESSON_CONTENT_ERROR_CODE.quizExamNotFound);
    }

    if (exam.courseId !== input.courseId) {
      throw new AppError("Linked exam must belong to this course", 422, LESSON_CONTENT_ERROR_CODE.quizExamWrongCourse);
    }

    return serializeLessonContentPayload({
      version: 1,
      kind: LESSON_CONTENT_TYPE.quiz,
      examId
    });
  }

  if (contentType === LESSON_CONTENT_TYPE.liveSession) {
    const parsed = parseLessonContentPayload(input.content, contentType);
    const meetingUrl = parsed.meetingUrl?.trim() ?? "";
    const instructions = parsed.instructions?.trim() ?? "";
    const startsAt = parsed.startsAt?.trim() ?? "";

    if (!meetingUrl && !instructions) {
      throw new AppError("Live session requires a meeting link or instructions", 422, LESSON_CONTENT_ERROR_CODE.liveSessionDetailsRequired);
    }

    if (startsAt) {
      const startsAtDate = new Date(startsAt);
      if (Number.isNaN(startsAtDate.getTime())) {
        throw new AppError("Invalid live session start time", 422, LESSON_CONTENT_ERROR_CODE.invalidContent);
      }
    }

    const durationMinutes = parsed.durationMinutes;
    if (durationMinutes !== undefined && durationMinutes !== null) {
      if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 480) {
        throw new AppError("Live session duration must be between 5 and 480 minutes", 422, LESSON_CONTENT_ERROR_CODE.invalidContent);
      }
    }

    if (meetingUrl) {
      try {
        const url = new URL(meetingUrl);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        throw new AppError("Live session meeting link must be a valid http(s) URL", 422, LESSON_CONTENT_ERROR_CODE.invalidContent);
      }
    }

    return serializeLessonContentPayload({
      version: 1,
      kind: LESSON_CONTENT_TYPE.liveSession,
      ...(meetingUrl ? { meetingUrl } : {}),
      ...(instructions ? { instructions } : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(durationMinutes !== undefined && durationMinutes !== null ? { durationMinutes } : {})
    });
  }

  if (contentType === LESSON_CONTENT_TYPE.codeExercise) {
    const parsed = parseLessonContentPayload(input.content, contentType);
    const language = parsed.language?.trim() ?? "";

    if (!CODE_QUESTION_LANGUAGES.includes(language as (typeof CODE_QUESTION_LANGUAGES)[number])) {
      throw new AppError(
        `Code exercise language must be one of: ${CODE_QUESTION_LANGUAGES.join(", ")}`,
        422,
        LESSON_CONTENT_ERROR_CODE.codeLanguageInvalid
      );
    }

    const starterCode = parsed.starterCode ?? "";
    if (starterCode.length > LESSON_CODE_LIMITS.starterCodeMax) {
      throw new AppError(
        `Starter code must be at most ${LESSON_CODE_LIMITS.starterCodeMax} characters`,
        422,
        LESSON_CONTENT_ERROR_CODE.invalidContent
      );
    }

    const instructions = parsed.instructions?.trim() ?? "";
    if (instructions.length > LESSON_CODE_LIMITS.instructionsMax) {
      throw new AppError(
        `Instructions must be at most ${LESSON_CODE_LIMITS.instructionsMax} characters`,
        422,
        LESSON_CONTENT_ERROR_CODE.invalidContent
      );
    }

    const codeTests = validateLessonCodeTests(parsed.codeTests);

    return serializeLessonContentPayload({
      version: 1,
      kind: LESSON_CONTENT_TYPE.codeExercise,
      language,
      ...(starterCode ? { starterCode } : {}),
      ...(instructions ? { instructions } : {}),
      codeTests
    });
  }

  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new AppError("Lesson content is required", 422, LESSON_CONTENT_ERROR_CODE.invalidContent);
  }

  return trimmed;
}
