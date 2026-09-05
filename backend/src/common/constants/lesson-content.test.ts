import { describe, expect, it } from "vitest";
import {
  LESSON_CONTENT_TYPE,
  parseLessonContentPayload,
  serializeLessonContentPayload,
  type LessonContentPayload
} from "./lesson-content";

/**
 * Lesson content is stored as a single TEXT column that has held three shapes
 * over time: a bare URL, a bare body, and the current JSON payload. Parsing has
 * to keep reading all three, because lessons authored before the payload
 * existed are still in the database.
 */
describe("parseLessonContentPayload", () => {
  describe("legacy rows stored before the JSON payload", () => {
    it("reads a bare URL as the url for a video lesson", () => {
      const parsed = parseLessonContentPayload("https://example.com/v.mp4", LESSON_CONTENT_TYPE.video);
      expect(parsed).toMatchObject({ kind: LESSON_CONTENT_TYPE.video, url: "https://example.com/v.mp4" });
      expect(parsed.body).toBeUndefined();
    });

    it("reads a bare URL as the url for a resource lesson", () => {
      const parsed = parseLessonContentPayload("https://example.com/a.pdf", LESSON_CONTENT_TYPE.resource);
      expect(parsed.url).toBe("https://example.com/a.pdf");
    });

    it("reads bare text as the body for a text lesson", () => {
      const parsed = parseLessonContentPayload("<p>hello</p>", LESSON_CONTENT_TYPE.text);
      expect(parsed).toMatchObject({ kind: LESSON_CONTENT_TYPE.text, body: "<p>hello</p>" });
      expect(parsed.url).toBeUndefined();
    });

    it("does not crash on content that looks like JSON but is not a payload", () => {
      const parsed = parseLessonContentPayload('{"unrelated": true}', LESSON_CONTENT_TYPE.text);
      expect(parsed.body).toBe('{"unrelated": true}');
    });

    it("does not crash on malformed JSON", () => {
      const parsed = parseLessonContentPayload("{not json", LESSON_CONTENT_TYPE.text);
      expect(parsed.body).toBe("{not json");
    });

    it("ignores a JSON payload missing the version marker", () => {
      const parsed = parseLessonContentPayload('{"kind":"TEXT","body":"x"}', LESSON_CONTENT_TYPE.text);
      expect(parsed.body).toBe('{"kind":"TEXT","body":"x"}');
    });
  });

  describe("round trip", () => {
    it("preserves a code exercise payload, whitespace included", () => {
      const payload: LessonContentPayload = {
        version: 1,
        kind: LESSON_CONTENT_TYPE.codeExercise,
        language: "python",
        starterCode: "print(0)\n",
        instructions: "Print the sum",
        codeTests: [{ name: "adds", input: "2 3\n", expectedOutput: "5\n" }]
      };

      expect(parseLessonContentPayload(serializeLessonContentPayload(payload), LESSON_CONTENT_TYPE.codeExercise)).toEqual(
        payload
      );
    });

    it("preserves a live session payload", () => {
      const payload: LessonContentPayload = {
        version: 1,
        kind: LESSON_CONTENT_TYPE.liveSession,
        meetingUrl: "https://meet.example.com/x",
        startsAt: "2026-01-01T10:00:00.000Z",
        durationMinutes: 60
      };

      const parsed = parseLessonContentPayload(serializeLessonContentPayload(payload), LESSON_CONTENT_TYPE.liveSession);
      expect(parsed).toMatchObject(payload);
    });

    it("preserves the linked exam of a quiz payload", () => {
      const content = serializeLessonContentPayload({
        version: 1,
        kind: LESSON_CONTENT_TYPE.quiz,
        examId: "exam-1"
      });

      expect(parseLessonContentPayload(content, LESSON_CONTENT_TYPE.quiz).examId).toBe("exam-1");
    });
  });

  it("drops codeTests that are not an array rather than passing them through", () => {
    const content = '{"version":1,"kind":"CODE_EXERCISE","language":"python","codeTests":"nope"}';
    expect(parseLessonContentPayload(content, LESSON_CONTENT_TYPE.codeExercise).codeTests).toBeUndefined();
  });

  it("trusts the payload's own kind over the column's content type", () => {
    // The column and the payload can disagree on rows written before a lesson
    // changed type; the payload is the more specific record.
    const content = '{"version":1,"kind":"TEXT","body":"x"}';
    expect(parseLessonContentPayload(content, LESSON_CONTENT_TYPE.video).kind).toBe(LESSON_CONTENT_TYPE.text);
  });
});
