import { AppError } from "../errors/app-error";
import {
  LESSON_CONTENT_ERROR_CODE,
  LESSON_CONTENT_TYPE,
  type LessonContentType,
  parseLessonContentPayload,
  serializeLessonContentPayload
} from "../constants/lesson-content";
import type { ExamRepository } from "../../modules/exam/exam.repository";

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
      ...(startsAt ? { startsAt } : {})
    });
  }

  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new AppError("Lesson content is required", 422, LESSON_CONTENT_ERROR_CODE.invalidContent);
  }

  return trimmed;
}
