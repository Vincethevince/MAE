import { describe, it, expect } from "vitest";

function getHourInBerlin(isoString: string): number {
  const d = new Date(isoString);
  const berlinHour = parseInt(
    new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Berlin",
    }).format(d),
    10
  );
  return isNaN(berlinHour) ? d.getUTCHours() : berlinHour % 24;
}

function getDayOfWeekInBerlin(isoString: string): number {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Berlin",
  }).formatToParts(d);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const MAP: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return MAP[weekday ?? "Mon"] ?? 1;
}

describe("getHourInBerlin", () => {
  it("returns 12 for 10:30 UTC in summer (UTC+2)", () => {
    expect(getHourInBerlin("2026-04-15T10:30:00Z")).toBe(12);
  });

  it("returns 11 for 10:30 UTC in winter (UTC+1)", () => {
    expect(getHourInBerlin("2026-01-15T10:30:00Z")).toBe(11);
  });

  it("returns 0 for 22:00 UTC in summer — midnight Berlin — verifying % 24 fix", () => {
    expect(getHourInBerlin("2026-04-15T22:00:00Z")).toBe(0);
  });
});

describe("getDayOfWeekInBerlin", () => {
  it("returns 3 (Wednesday) for 2026-04-15T10:00:00Z", () => {
    expect(getDayOfWeekInBerlin("2026-04-15T10:00:00Z")).toBe(3);
  });

  it("returns 0 (Sunday) for 2026-04-19T10:00:00Z", () => {
    expect(getDayOfWeekInBerlin("2026-04-19T10:00:00Z")).toBe(0);
  });
});

describe("bucketing logic", () => {
  it("accumulates hour counts correctly", () => {
    const appts = [
      { start_time: "2026-04-15T10:30:00Z" }, // hour 12 Berlin (UTC+2)
      { start_time: "2026-04-15T10:30:00Z" }, // hour 12 again
      { start_time: "2026-04-15T08:00:00Z" }, // hour 10 Berlin
    ];

    const hourCounts = new Array<number>(24).fill(0);
    for (const a of appts) {
      const h = getHourInBerlin(a.start_time);
      if (h >= 0 && h < 24) hourCounts[h]++;
    }

    expect(hourCounts[12]).toBe(2);
    expect(hourCounts[10]).toBe(1);
    expect(hourCounts[11]).toBe(0);
  });

  it("accumulates day-of-week counts correctly", () => {
    const appts = [
      { start_time: "2026-04-15T10:00:00Z" }, // Wednesday (3)
      { start_time: "2026-04-15T14:00:00Z" }, // Wednesday (3)
      { start_time: "2026-04-19T10:00:00Z" }, // Sunday (0)
    ];

    const dayCounts = new Array<number>(7).fill(0);
    for (const a of appts) {
      const dow = getDayOfWeekInBerlin(a.start_time);
      if (dow >= 0 && dow < 7) dayCounts[dow]++;
    }

    expect(dayCounts[3]).toBe(2); // Wednesday
    expect(dayCounts[0]).toBe(1); // Sunday
    expect(dayCounts[1]).toBe(0); // Monday
  });
});
