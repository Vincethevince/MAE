import { describe, it, expect } from "vitest";
import { phoneSchema } from "../validations/auth";

describe("phoneSchema", () => {
  it("accepts empty string", () => {
    expect(phoneSchema.safeParse("").success).toBe(true);
  });
  it("accepts undefined", () => {
    expect(phoneSchema.safeParse(undefined).success).toBe(true);
  });
  it("accepts +49 format", () => {
    expect(phoneSchema.safeParse("+49 123 456789").success).toBe(true);
  });
  it("accepts local format with hyphens", () => {
    expect(phoneSchema.safeParse("0123-456789").success).toBe(true);
  });
  it("accepts format with parentheses", () => {
    expect(phoneSchema.safeParse("+1 (555) 123-4567").success).toBe(true);
  });
  it("rejects string that is too long", () => {
    expect(phoneSchema.safeParse("1".repeat(31)).success).toBe(false);
  });
  it("rejects letters-only", () => {
    expect(phoneSchema.safeParse("abcdefghij").success).toBe(false);
  });
  it("rejects too short number", () => {
    expect(phoneSchema.safeParse("+123").success).toBe(false);
  });
});
