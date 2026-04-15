import { describe, it, expect } from "vitest";
import { computeAvailableSlots } from "../booking";
import type { Database } from "@/types/database";

type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeAvail(dayOfWeek: number, startTime: string, endTime: string): AvailabilityRow {
  return {
    id: "avail-1",
    provider_id: "provider-1",
    employee_id: null,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    created_at: new Date().toISOString(),
  };
}

function makeAppt(
  id: string,
  startIso: string,
  endIso: string,
  status: AppointmentRow["status"] = "confirmed"
): AppointmentRow {
  return {
    id,
    user_id: "user-1",
    provider_id: "provider-1",
    employee_id: null,
    service_id: "svc-1",
    start_time: startIso,
    end_time: endIso,
    status,
    notes: null,
    price_cents: 5000,
    reminder_24h_sent_at: null,
    review_requested_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Monday 2025-01-06 (dayOfWeek=1 in JS, provider availability uses 1 for Monday)
const MONDAY = new Date("2025-01-06T00:00:00.000Z");

// ─── Pure logic helpers (mirrored from actions.ts) ────────────────────────────

/**
 * Returns true if the current appointment start_time is more than 24h away.
 * (24h cutoff rule — reschedule is allowed when this returns true)
 */
function isRescheduleAllowedByTime(apptStartIso: string, nowMs: number): boolean {
  const hoursUntilStart = (new Date(apptStartIso).getTime() - nowMs) / (1000 * 60 * 60);
  return hoursUntilStart >= 24;
}

/**
 * Returns true if the two intervals [aStart, aEnd) and [bStart, bEnd) overlap.
 */
function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("reschedule – 24h cutoff logic", () => {
  it("blocks rescheduling when appointment is 23h away", () => {
    const now = Date.now();
    const apptStart = new Date(now + 23 * 60 * 60 * 1000).toISOString(); // 23h from now
    expect(isRescheduleAllowedByTime(apptStart, now)).toBe(false);
  });

  it("allows rescheduling when appointment is 25h away", () => {
    const now = Date.now();
    const apptStart = new Date(now + 25 * 60 * 60 * 1000).toISOString(); // 25h from now
    expect(isRescheduleAllowedByTime(apptStart, now)).toBe(true);
  });

  it("blocks rescheduling at exactly 24h boundary (edge: < 24h not satisfied)", () => {
    const now = Date.now();
    // 24h - 1 minute
    const apptStart = new Date(now + 24 * 60 * 60 * 1000 - 60 * 1000).toISOString();
    expect(isRescheduleAllowedByTime(apptStart, now)).toBe(false);
  });

  it("allows rescheduling at exactly 24h", () => {
    const now = Date.now();
    const apptStart = new Date(now + 24 * 60 * 60 * 1000).toISOString(); // exactly 24h
    expect(isRescheduleAllowedByTime(apptStart, now)).toBe(true);
  });
});

describe("reschedule – slot overlap detection", () => {
  it("detects that a new slot overlapping an existing appointment is unavailable", () => {
    // Existing appointment: 10:00 – 11:00
    const existingStart = new Date("2025-01-06T10:00:00Z").getTime();
    const existingEnd = new Date("2025-01-06T11:00:00Z").getTime();

    // New slot: 10:30 – 11:30 (overlaps)
    const newStart = new Date("2025-01-06T10:30:00Z").getTime();
    const newEnd = new Date("2025-01-06T11:30:00Z").getTime();

    expect(intervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });

  it("does not flag a non-overlapping slot as unavailable", () => {
    // Existing appointment: 10:00 – 11:00
    const existingStart = new Date("2025-01-06T10:00:00Z").getTime();
    const existingEnd = new Date("2025-01-06T11:00:00Z").getTime();

    // New slot: 11:00 – 12:00 (adjacent, no overlap)
    const newStart = new Date("2025-01-06T11:00:00Z").getTime();
    const newEnd = new Date("2025-01-06T12:00:00Z").getTime();

    expect(intervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
  });

  it("does not flag a slot before an existing appointment as unavailable", () => {
    // Existing appointment: 14:00 – 15:00
    const existingStart = new Date("2025-01-06T14:00:00Z").getTime();
    const existingEnd = new Date("2025-01-06T15:00:00Z").getTime();

    // New slot: 12:00 – 13:00
    const newStart = new Date("2025-01-06T12:00:00Z").getTime();
    const newEnd = new Date("2025-01-06T13:00:00Z").getTime();

    expect(intervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
  });

  it("detects full containment as overlap", () => {
    // Existing appointment: 09:00 – 11:00
    const existingStart = new Date("2025-01-06T09:00:00Z").getTime();
    const existingEnd = new Date("2025-01-06T11:00:00Z").getTime();

    // New slot: 09:30 – 10:30 (fully inside existing)
    const newStart = new Date("2025-01-06T09:30:00Z").getTime();
    const newEnd = new Date("2025-01-06T10:30:00Z").getTime();

    expect(intervalsOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
  });
});

describe("reschedule – current appointment excluded from conflict check", () => {
  it("makes the current appointment's slot available after filtering it out", () => {
    // Provider has availability on Monday 09:00 – 17:00
    const availability = [makeAvail(1, "09:00", "17:00")];

    // The appointment being rescheduled occupies 10:00 – 11:00
    const currentApptId = "current-appt-id";
    const currentAppt = makeAppt(
      currentApptId,
      "2025-01-06T10:00:00.000Z",
      "2025-01-06T11:00:00.000Z"
    );

    // Without filtering: slot at 10:00 should NOT appear (blocked by current appt)
    const slotsWithCurrentAppt = computeAvailableSlots(
      MONDAY,
      availability,
      [currentAppt],
      60 // 60-minute service
    );
    const has10Without = slotsWithCurrentAppt.some(
      (s) => s.startTime.toISOString() === "2025-01-06T10:00:00.000Z"
    );
    expect(has10Without).toBe(false);

    // After filtering out the current appointment: 10:00 slot should be available
    const filteredAppointments = [currentAppt].filter((a) => a.id !== currentApptId);
    const slotsWithFiltered = computeAvailableSlots(
      MONDAY,
      availability,
      filteredAppointments,
      60
    );
    const has10After = slotsWithFiltered.some(
      (s) => s.startTime.toISOString() === "2025-01-06T10:00:00.000Z"
    );
    expect(has10After).toBe(true);
  });

  it("does not free up a slot occupied by a DIFFERENT appointment when current is excluded", () => {
    const availability = [makeAvail(1, "09:00", "17:00")];

    const currentApptId = "current-appt-id";
    const currentAppt = makeAppt(
      currentApptId,
      "2025-01-06T10:00:00.000Z",
      "2025-01-06T11:00:00.000Z"
    );
    const otherAppt = makeAppt(
      "other-appt-id",
      "2025-01-06T12:00:00.000Z",
      "2025-01-06T13:00:00.000Z"
    );

    // After filtering out only the current appointment, 12:00 should still be blocked
    const filteredAppointments = [currentAppt, otherAppt].filter(
      (a) => a.id !== currentApptId
    );
    const slots = computeAvailableSlots(
      MONDAY,
      availability,
      filteredAppointments,
      60
    );
    const has12 = slots.some(
      (s) => s.startTime.toISOString() === "2025-01-06T12:00:00.000Z"
    );
    expect(has12).toBe(false);
  });
});
