import { describe, it, expect } from "vitest";
import { toIcsDateTime, escapeIcsText, foldLine } from "../ics-utils";

// ─── toIcsDateTime ────────────────────────────────────────────────────────────

describe("toIcsDateTime", () => {
  it("formats a known UTC date to the correct iCalendar string", () => {
    const date = new Date("2024-03-15T14:30:00.000Z");
    expect(toIcsDateTime(date)).toBe("20240315T143000Z");
  });

  it("formats midnight correctly", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    expect(toIcsDateTime(date)).toBe("20240101T000000Z");
  });

  it("contains no dashes", () => {
    const result = toIcsDateTime(new Date("2024-06-20T10:15:30.000Z"));
    expect(result).not.toContain("-");
  });

  it("contains no colons", () => {
    const result = toIcsDateTime(new Date("2024-06-20T10:15:30.000Z"));
    expect(result).not.toContain(":");
  });

  it("contains no milliseconds", () => {
    const result = toIcsDateTime(new Date("2024-06-20T10:15:30.123Z"));
    expect(result).not.toMatch(/\.\d/);
  });

  it("ends with Z to indicate UTC", () => {
    const result = toIcsDateTime(new Date("2024-06-20T10:15:30.000Z"));
    expect(result).toMatch(/Z$/);
  });
});

// ─── escapeIcsText ────────────────────────────────────────────────────────────

describe("escapeIcsText", () => {
  it("escapes backslash to double backslash", () => {
    expect(escapeIcsText("a\\b")).toBe("a\\\\b");
  });

  it("escapes semicolon", () => {
    expect(escapeIcsText("a;b")).toBe("a\\;b");
  });

  it("escapes comma", () => {
    expect(escapeIcsText("a,b")).toBe("a\\,b");
  });

  it("escapes newline \\n to literal \\n", () => {
    expect(escapeIcsText("a\nb")).toBe("a\\nb");
  });

  it("removes carriage return \\r", () => {
    expect(escapeIcsText("a\rb")).toBe("ab");
  });

  it("removes \\r from \\r\\n sequences", () => {
    expect(escapeIcsText("a\r\nb")).toBe("a\\nb");
  });

  it("leaves normal text unchanged", () => {
    expect(escapeIcsText("Hello World")).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(escapeIcsText("")).toBe("");
  });

  it("handles multiple special characters in one string", () => {
    expect(escapeIcsText("a\\b;c,d\ne\rf")).toBe("a\\\\b\\;c\\,d\\nef");
  });
});

// ─── foldLine ─────────────────────────────────────────────────────────────────

describe("foldLine", () => {
  it("returns a short line (under 75 bytes) unchanged", () => {
    const line = "SUMMARY:Hello World";
    expect(foldLine(line)).toBe(line);
  });

  it("returns a line of exactly 75 bytes unchanged", () => {
    // 75 ASCII characters
    const line = "A".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("folds a line of 76 bytes at position 75 with CRLF + space", () => {
    const line = "A".repeat(76);
    const result = foldLine(line);
    expect(result).toBe("A".repeat(75) + "\r\n" + " " + "A");
  });

  it("folds a line of 150 bytes at the correct boundaries", () => {
    // 150 ASCII chars: first chunk 75, continuation chunk 74, last chunk 1
    const line = "B".repeat(150);
    const result = foldLine(line);
    const parts = result.split("\r\n");
    expect(parts[0].length).toBe(75);
    // continuation lines are prefixed with a space
    expect(parts[1]).toBe(" " + "B".repeat(74));
    expect(parts[2]).toBe(" " + "B");
  });

  it("does not break a multi-byte UTF-8 character across fold boundaries", () => {
    // Each '€' is 3 bytes in UTF-8.
    // 25 × '€' = 75 bytes → exactly at boundary, no fold needed.
    const exact = "€".repeat(25);
    expect(foldLine(exact)).toBe(exact);

    // 26 × '€' = 78 bytes → must fold, but the fold must not split a 3-byte sequence.
    const overBoundary = "€".repeat(26);
    const result = foldLine(overBoundary);
    // Verify each fold segment decodes cleanly (no replacement characters)
    expect(result).not.toContain("\uFFFD");
    // The result should contain at least one CRLF fold
    expect(result).toContain("\r\n");
    // Reassembling (removing CRLF + leading space) must equal the original
    const reassembled = result.replace(/\r\n /g, "");
    expect(reassembled).toBe(overBoundary);
  });
});
