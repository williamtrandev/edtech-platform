import { describe, expect, it } from "vitest";
import { formatMoney, isPaidCourse } from "./course-pricing";

/**
 * Pricing bugs are silently expensive: a wrong divisor shows a VND course at
 * 1/100th its price. The zero-decimal rule is the part worth pinning down.
 */
describe("formatMoney", () => {
  it("divides by 100 for currencies that have a minor unit", () => {
    expect(formatMoney(1999, "USD", "en-US")).toBe("$19.99");
  });

  it("treats the stored integer as the whole amount for VND", () => {
    // 500000 is 500,000 VND, not 5,000 VND — VND has no minor unit.
    expect(formatMoney(500000, "VND", "vi-VN")).toContain("500.000");
  });

  it("does not divide zero-decimal currencies by 100", () => {
    const vnd = formatMoney(100, "VND", "en-US");
    const usd = formatMoney(100, "USD", "en-US");
    expect(vnd).toContain("100");
    expect(usd).toContain("1.00");
  });

  it("accepts a lowercase currency code", () => {
    expect(formatMoney(1999, "usd", "en-US")).toBe(formatMoney(1999, "USD", "en-US"));
  });

  it("falls back to a plain string instead of throwing on an unknown code", () => {
    // Intl throws on a non-ISO code; a broken price must not crash the page.
    expect(formatMoney(1999, "NOTACODE", "en-US")).toBe("NOTACODE 19.99");
  });

  it("keeps the zero-decimal rule in the fallback path", () => {
    expect(formatMoney(500000, "VNDX", "en-US")).toBe("VNDX 5000.00");
  });

  it("formats zero", () => {
    expect(formatMoney(0, "USD", "en-US")).toBe("$0.00");
  });
});

describe("isPaidCourse", () => {
  it.each([
    [undefined, false],
    [null, false],
    [0, false],
    [1, true],
    [500000, true]
  ])("price %p is paid: %p", (price, expected) => {
    expect(isPaidCourse(price)).toBe(expected);
  });

  it("does not treat a negative price as paid", () => {
    expect(isPaidCourse(-100)).toBe(false);
  });
});
