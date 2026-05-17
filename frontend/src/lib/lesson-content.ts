import { LESSON_CONTENT_TYPE, type LessonContentType } from "../constants/business";

export type LessonContentPayload = {
  version: 1;
  kind: LessonContentType;
  body?: string;
  url?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
};

export function serializeLessonContent(payload: LessonContentPayload) {
  return JSON.stringify(payload);
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
        size: parsed.size
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
