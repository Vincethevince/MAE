import { describe, it, expect } from "vitest";

// This regex is defined in the route — test it independently to ensure
// the input validation is solid before any network call.
const SAFE_QUERY_RE = /^[\p{L}\d\s\-]{2,50}$/u;

describe("geo suggestions input validation", () => {
  it("accepts plain city names", () => {
    expect(SAFE_QUERY_RE.test("Berlin")).toBe(true);
    expect(SAFE_QUERY_RE.test("München")).toBe(true);
    expect(SAFE_QUERY_RE.test("Frankfurt am Main")).toBe(true);
  });

  it("accepts postal codes", () => {
    expect(SAFE_QUERY_RE.test("10115")).toBe(true);
    expect(SAFE_QUERY_RE.test("80331")).toBe(true);
  });

  it("accepts city with hyphen", () => {
    expect(SAFE_QUERY_RE.test("Halle-Saale")).toBe(true);
    expect(SAFE_QUERY_RE.test("Baden-Baden")).toBe(true);
  });

  it("accepts German special chars (umlauts, ß)", () => {
    expect(SAFE_QUERY_RE.test("Öhringen")).toBe(true);
    expect(SAFE_QUERY_RE.test("Straße")).toBe(true);
    expect(SAFE_QUERY_RE.test("Lübeck")).toBe(true);
  });

  it("rejects too-short input (< 2 chars)", () => {
    expect(SAFE_QUERY_RE.test("B")).toBe(false);
    expect(SAFE_QUERY_RE.test("")).toBe(false);
  });

  it("rejects injection attempts", () => {
    expect(SAFE_QUERY_RE.test("<script>alert(1)</script>")).toBe(false);
    expect(SAFE_QUERY_RE.test("Berlin'; DROP TABLE")).toBe(false);
    expect(SAFE_QUERY_RE.test("../../../etc/passwd")).toBe(false);
    expect(SAFE_QUERY_RE.test('";alert(1)"')).toBe(false);
  });

  it("rejects too-long input (> 50 chars)", () => {
    expect(SAFE_QUERY_RE.test("B".repeat(51))).toBe(false);
  });

  it("accepts exactly 50 chars", () => {
    expect(SAFE_QUERY_RE.test("B".repeat(50))).toBe(true);
  });

  it("accepts exactly 2 chars", () => {
    expect(SAFE_QUERY_RE.test("Be")).toBe(true);
  });
});
