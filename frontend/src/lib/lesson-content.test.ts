import { describe, expect, it } from "vitest";
import { LESSON_CONTENT_TYPE } from "../constants/business";
import { buildLessonContentForSubmit, buildLessonContentFromForm, isLessonHtmlEmpty, parseLessonContent } from "./lesson-content";

const parse = (content: string) => JSON.parse(content) as Record<string, unknown>;

/**
 * isLessonHtmlEmpty gates "content required" for rich-text lessons. The editor
 * emits markup even when the author typed nothing, so a naive length check
 * would let an empty lesson through.
 */
describe("isLessonHtmlEmpty", () => {
  it.each(["", "   ", "<p></p>", "<p><br></p>", "<p>&nbsp;</p>", "<p>&#160;</p>", "<div><p>  </p></div>"])(
    "treats %p as empty",
    (html) => {
      expect(isLessonHtmlEmpty(html)).toBe(true);
    }
  );

  it.each(["<p>hello</p>", "<p>&nbsp;x</p>", "plain text"])("treats %p as not empty", (html) => {
    expect(isLessonHtmlEmpty(html)).toBe(false);
  });
});

describe("buildLessonContentFromForm", () => {
  it("stores text content in body", () => {
    const built = parse(
      buildLessonContentFromForm({ contentType: LESSON_CONTENT_TYPE.text, content: "  <p>hi</p>  " })
    );
    expect(built).toMatchObject({ version: 1, kind: LESSON_CONTENT_TYPE.text, body: "<p>hi</p>" });
  });

  it("stores video content in url, not body", () => {
    const built = parse(
      buildLessonContentFromForm({ contentType: LESSON_CONTENT_TYPE.video, content: " https://x/v.mp4 " })
    );
    expect(built).toMatchObject({ kind: LESSON_CONTENT_TYPE.video, url: "https://x/v.mp4" });
    expect(built.body).toBeUndefined();
  });

  it("keeps the linked exam for a quiz", () => {
    const built = parse(
      buildLessonContentFromForm({ contentType: LESSON_CONTENT_TYPE.quiz, content: "", quizExamId: " exam-1 " })
    );
    expect(built.examId).toBe("exam-1");
  });

  describe("live session", () => {
    const base = { contentType: LESSON_CONTENT_TYPE.liveSession, content: "" } as const;

    it("omits blank optional fields rather than writing empty strings", () => {
      const built = parse(buildLessonContentFromForm({ ...base, liveMeetingUrl: "https://m/x", liveInstructions: "  " }));
      expect(built.meetingUrl).toBe("https://m/x");
      expect("instructions" in built).toBe(false);
      expect("startsAt" in built).toBe(false);
    });

    it.each([["" as const], [null], [undefined]])("omits durationMinutes when it is %p", (duration) => {
      const built = parse(buildLessonContentFromForm({ ...base, liveMeetingUrl: "https://m/x", liveDurationMinutes: duration }));
      expect("durationMinutes" in built).toBe(false);
    });

    it("coerces a numeric duration", () => {
      const built = parse(buildLessonContentFromForm({ ...base, liveMeetingUrl: "https://m/x", liveDurationMinutes: 45 }));
      expect(built.durationMinutes).toBe(45);
    });
  });
});

describe("buildLessonContentForSubmit", () => {
  it("attaches uploaded file metadata to a resource lesson", () => {
    const built = parse(
      buildLessonContentForSubmit(
        { contentType: LESSON_CONTENT_TYPE.resource, content: "/uploads/a.pdf" },
        { fileName: "a.pdf", mimeType: "application/pdf", size: 12 }
      )
    );
    expect(built).toMatchObject({ url: "/uploads/a.pdf", fileName: "a.pdf", mimeType: "application/pdf", size: 12 });
  });

  it("omits file metadata when nothing was uploaded", () => {
    const built = parse(
      buildLessonContentForSubmit({ contentType: LESSON_CONTENT_TYPE.resource, content: "/uploads/a.pdf" }, null)
    );
    expect("fileName" in built).toBe(false);
  });
});

describe("parseLessonContent", () => {
  it("round trips what the form builds", () => {
    const content = buildLessonContentFromForm({ contentType: LESSON_CONTENT_TYPE.text, content: "<p>hi</p>" });
    expect(parseLessonContent(content, LESSON_CONTENT_TYPE.text).body).toBe("<p>hi</p>");
  });

  it("reads a legacy bare URL for a video lesson", () => {
    expect(parseLessonContent("https://x/v.mp4", LESSON_CONTENT_TYPE.video).url).toBe("https://x/v.mp4");
  });

  it("reads legacy bare text as the body", () => {
    expect(parseLessonContent("hello", LESSON_CONTENT_TYPE.text).body).toBe("hello");
  });

  it("survives malformed JSON", () => {
    expect(parseLessonContent("{oops", LESSON_CONTENT_TYPE.text).body).toBe("{oops");
  });

  it("agrees with the backend on dropping non-array codeTests", () => {
    const content = '{"version":1,"kind":"CODE_EXERCISE","language":"python","codeTests":"nope"}';
    expect(parseLessonContent(content, LESSON_CONTENT_TYPE.codeExercise).codeTests).toBeUndefined();
  });
});
