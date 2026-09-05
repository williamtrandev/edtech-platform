import { describe, expect, it } from "vitest";
import { ApiError, isOpaqueHttpErrorMessage, resolveErrorMessage } from "./api-error";

/**
 * These two guard what a user actually reads when something fails. Reaching for
 * `error.message` directly bypasses both: it leaks transport noise like
 * "Request failed with status code 413" and skips the error-code translation,
 * so a Vietnamese user gets an English backend string.
 */
describe("isOpaqueHttpErrorMessage", () => {
  it.each([
    "",
    "   ",
    "Request failed with status code 413",
    "Request failed with status code 500",
    "Network Error",
    "timeout of 5000ms exceeded",
    "ERR_NETWORK"
  ])("treats %p as meaningless to a user", (message) => {
    expect(isOpaqueHttpErrorMessage(message)).toBe(true);
  });

  it.each([
    "Enroll in this course to run code",
    "The code sandbox is busy right now.",
    "Request failed because the file is too large"
  ])("keeps %p, which says something real", (message) => {
    expect(isOpaqueHttpErrorMessage(message)).toBe(false);
  });
});

describe("resolveErrorMessage", () => {
  const translate = (code: string) =>
    ({
      CODE_EXECUTION_BUSY: "Trình chạy code đang quá tải.",
      HTTP_413: "File quá lớn."
    })[code] ?? null;

  it("prefers the translated error code over the server's own wording", () => {
    const error = new ApiError("Code execution is busy, try again shortly", "CODE_EXECUTION_BUSY", 429);

    expect(resolveErrorMessage(error, "fallback", translate)).toBe("Trình chạy code đang quá tải.");
  });

  it("falls back to the server message when the code has no translation", () => {
    const error = new ApiError("Enroll in this course to run code", "COURSE_ENROLLMENT_REQUIRED", 403);

    expect(resolveErrorMessage(error, "fallback", translate)).toBe("Enroll in this course to run code");
  });

  it("translates by status code when neither the code nor a message helps", () => {
    const error = new ApiError("", "HTTP_ERROR", 413);

    expect(resolveErrorMessage(error, "fallback", translate)).toBe("File quá lớn.");
  });

  it("uses the caller's fallback rather than leaking transport noise", () => {
    const error = new Error("Request failed with status code 500");

    expect(resolveErrorMessage(error, "Something went wrong", translate)).toBe("Something went wrong");
  });

  it("keeps a plain Error whose message is genuinely useful", () => {
    const error = new Error("File is not a supported image type");

    expect(resolveErrorMessage(error, "fallback", translate)).toBe("File is not a supported image type");
  });

  it("falls back for a thrown non-Error", () => {
    expect(resolveErrorMessage("just a string", "fallback", translate)).toBe("fallback");
  });

  it("works with no translator at all", () => {
    const error = new ApiError("Plain message", "SOME_CODE", 400);

    expect(resolveErrorMessage(error, "fallback")).toBe("Plain message");
  });
});
