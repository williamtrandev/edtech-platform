export const LESSON_CONTENT_TYPE = {
  video: "VIDEO",
  text: "TEXT",
  resource: "RESOURCE",
  quiz: "QUIZ",
  liveSession: "LIVE_SESSION"
} as const;

export type LessonContentType = (typeof LESSON_CONTENT_TYPE)[keyof typeof LESSON_CONTENT_TYPE];

export const LESSON_CONTENT_ERROR_CODE = {
  invalidContent: "LESSON_CONTENT_INVALID",
  quizExamRequired: "LESSON_QUIZ_EXAM_REQUIRED",
  quizExamNotFound: "LESSON_QUIZ_EXAM_NOT_FOUND",
  quizExamWrongCourse: "LESSON_QUIZ_EXAM_WRONG_COURSE",
  liveSessionDetailsRequired: "LESSON_LIVE_SESSION_DETAILS_REQUIRED"
} as const;

export type LessonContentPayload = {
  version: 1;
  kind: LessonContentType;
  body?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  examId?: string;
  meetingUrl?: string;
  startsAt?: string;
  instructions?: string;
  durationMinutes?: number;
};

export function parseLessonContentPayload(content: string, contentType: LessonContentType): LessonContentPayload {
  try {
    const parsed = JSON.parse(content) as Partial<LessonContentPayload>;
    if (parsed.version === 1 && parsed.kind) {
      return {
        version: 1,
        kind: parsed.kind,
        body: parsed.body,
        url: parsed.url,
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
        size: parsed.size,
        examId: parsed.examId,
        meetingUrl: parsed.meetingUrl,
        startsAt: parsed.startsAt,
        instructions: parsed.instructions,
        durationMinutes: parsed.durationMinutes
      };
    }
  } catch {
    // Legacy plain text / URL storage.
  }

  if (contentType === LESSON_CONTENT_TYPE.video || contentType === LESSON_CONTENT_TYPE.resource) {
    return { version: 1, kind: contentType, url: content };
  }

  return { version: 1, kind: contentType, body: content };
}

export function serializeLessonContentPayload(payload: LessonContentPayload) {
  return JSON.stringify(payload);
}
