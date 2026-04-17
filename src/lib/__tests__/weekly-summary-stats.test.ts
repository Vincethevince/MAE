import { describe, it, expect } from "vitest";
import { getLastWeekRange } from "../weekly-summary-stats";

describe("getLastWeekRange", () => {
  it("given a Monday, returns the previous Mon 00:00 UTC – Sun 23:59:59 UTC", () => {
    // 2026-04-13 is a Monday
    const now = new Date("2026-04-13T08:00:00Z");
    const { start, end } = getLastWeekRange(now);

    expect(start.toISOString()).toBe("2026-04-06T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-12T23:59:59.000Z");
  });

  it("given a Wednesday, still returns the previous full Mon–Sun week", () => {
    // 2026-04-15 is a Wednesday — we still want Mon 2026-04-06 to Sun 2026-04-12
    const now = new Date("2026-04-15T12:00:00Z");
    const { start, end } = getLastWeekRange(now);

    expect(start.toISOString()).toBe("2026-04-06T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-12T23:59:59.000Z");
  });

  it("given a Sunday, returns the Mon–Sat of the same week as previous week's Mon–Sun", () => {
    // 2026-04-12 is a Sunday; previous week = 2026-04-06 Mon – 2026-04-12 Sun
    // But since Sun is still in the "current" week, previous week = 2026-03-30 – 2026-04-05
    const now = new Date("2026-04-12T23:00:00Z");
    const { start, end } = getLastWeekRange(now);

    expect(start.toISOString()).toBe("2026-03-30T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-05T23:59:59.000Z");
  });

  it("start is always a Monday at 00:00 UTC", () => {
    const now = new Date("2026-04-17T08:00:00Z"); // Friday
    const { start } = getLastWeekRange(now);

    // UTC day 1 = Monday
    expect(start.getUTCDay()).toBe(1);
    expect(start.getUTCHours()).toBe(0);
    expect(start.getUTCMinutes()).toBe(0);
    expect(start.getUTCSeconds()).toBe(0);
  });

  it("end is always a Sunday at 23:59:59 UTC", () => {
    const now = new Date("2026-04-17T08:00:00Z"); // Friday
    const { end } = getLastWeekRange(now);

    // UTC day 0 = Sunday
    expect(end.getUTCDay()).toBe(0);
    expect(end.getUTCHours()).toBe(23);
    expect(end.getUTCMinutes()).toBe(59);
    expect(end.getUTCSeconds()).toBe(59);
  });

  it("handles year boundary correctly", () => {
    // 2026-01-05 is a Monday; previous week = 2025-12-29 Mon – 2026-01-04 Sun
    const now = new Date("2026-01-05T08:00:00Z");
    const { start, end } = getLastWeekRange(now);

    expect(start.toISOString()).toBe("2025-12-29T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-01-04T23:59:59.000Z");
  });
});
