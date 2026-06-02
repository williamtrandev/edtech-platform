import { LESSON_CONTENT_TYPE, type LessonContentType } from "../constants/business";

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

export function serializeLessonContent(payload: LessonContentPayload) {
  return JSON.stringify(payload);
}

type LessonFormContentInput = {
  contentType: LessonContentType;
  content: string;
  quizExamId?: string;
  liveMeetingUrl?: string;
  liveStartsAt?: string;
  liveInstructions?: string;
  liveDurationMinutes?: number | "" | null;
};

export function buildLessonContentFromForm(values: LessonFormContentInput) {
  if (values.contentType === LESSON_CONTENT_TYPE.quiz) {
    return serializeLessonContent({
      version: 1,
      kind: LESSON_CONTENT_TYPE.quiz,
      examId: values.quizExamId?.trim() ?? ""
    });
  }

  if (values.contentType === LESSON_CONTENT_TYPE.liveSession) {
    const meetingUrl = values.liveMeetingUrl?.trim();
    const instructions = values.liveInstructions?.trim();
    const startsAt = values.liveStartsAt?.trim();
    const durationRaw = values.liveDurationMinutes;
    const durationMinutes =
      durationRaw === "" || durationRaw === null || durationRaw === undefined
        ? undefined
        : Number(durationRaw);

    return serializeLessonContent({
      version: 1,
      kind: LESSON_CONTENT_TYPE.liveSession,
      ...(meetingUrl ? { meetingUrl } : {}),
      ...(instructions ? { instructions } : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(durationMinutes !== undefined && Number.isFinite(durationMinutes) ? { durationMinutes } : {})
    });
  }

  const body = values.content.trim();
  if (values.contentType === LESSON_CONTENT_TYPE.text) {
    return serializeLessonContent({
      version: 1,
      kind: values.contentType,
      body
    });
  }

  return serializeLessonContent({
    version: 1,
    kind: values.contentType,
    url: body
  });
}

export function isLessonHtmlEmpty(html: string) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .trim();

  return text.length === 0;
}

export function parseLessonContent(content: string, contentType: LessonContentType): LessonContentPayload {
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
    // Existing lessons stored plain text/URL before rich payload support.
  }

  if (contentType === LESSON_CONTENT_TYPE.video || contentType === LESSON_CONTENT_TYPE.resource) {
    return { version: 1, kind: contentType, url: content };
  }

  return { version: 1, kind: contentType, body: content };
}
