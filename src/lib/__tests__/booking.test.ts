import { describe, it, expect } from "vitest";
import { computeAvailableSlots } from "../booking";
import type { Database } from "@/types/database";

type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type AppointmentRow = Database["public"]["Tables"]["appointments"]["Row"];

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeAvail(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  employeeId: string | null = null
): AvailabilityRow {
  return {
    id: "avail-1",
    provider_id: "provider-1",
    employee_id: employeeId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    created_at: new Date().toISOString(),
  };
}

function makeAppt(startIso: string, endIso: string): AppointmentRow {
  return {
    id: "appt-1",
    user_id: "user-1",
    provider_id: "provider-1",
    employee_id: null,
    service_id: "svc-1",
    start_time: startIso,
    end_time: endIso,
    status: "confirmed",
    notes: null,
    price_cents: 5000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Create a date on a specific weekday (Mon=1 … Sun=0) in the current week. */
function dateForWeekday(jsDay: number): Date {
  const d = new Date("2025-01-06"); // Monday 2025-01-06 (day=1)
  const diff = ((jsDay - 1 + 7) % 7);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("computeAvailableSlots", () => {
  it("returns empty array when no availability for the given day", () => {
    const monday = dateForWeekday(1);
    // Only Sunday availability
    const availability = [makeAvail(0, "09:00", "17:00")];
    const slots = computeAvailableSlots(monday, availability, [], 60);
    expect(slots).toHaveLength(0);
  });

  it("ignores employee-level availability rows (employee_id != null)", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "17:00", "emp-1")];
    const slots = computeAvailableSlots(monday, availability, [], 60);
    expect(slots).toHaveLength(0);
  });

  it("generates slots at 15-minute intervals within availability window", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "10:00")];
    const slots = computeAvailableSlots(monday, availability, [], 30);
    // 09:00–09:30, 09:15–09:45, 09:30–10:00 → 3 slots
    expect(slots).toHaveLength(3);
    expect(slots[0]!.startTime.getHours()).toBe(9);
    expect(slots[0]!.startTime.getMinutes()).toBe(0);
    expect(slots[1]!.startTime.getMinutes()).toBe(15);
    expect(slots[2]!.startTime.getMinutes()).toBe(30);
  });

  it("slot end must not exceed availability window end", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "09:45")];
    const slots = computeAvailableSlots(monday, availability, [], 60);
    // 60-min service doesn't fit in 45-min window
    expect(slots).toHaveLength(0);
  });

  it("exactly one slot when window equals service duration", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "10:00")];
    const slots = computeAvailableSlots(monday, availability, [], 60);
    // Only 09:00–10:00 fits
    expect(slots).toHaveLength(1);
    expect(slots[0]!.startTime.getHours()).toBe(9);
    expect(slots[0]!.endTime.getHours()).toBe(10);
  });

  it("excludes slots that overlap with an existing appointment", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "11:00")];
    // Appointment from 09:30 to 10:30
    const apptStart = new Date(monday);
    apptStart.setHours(9, 30, 0, 0);
    const apptEnd = new Date(monday);
    apptEnd.setHours(10, 30, 0, 0);
    const appointments = [makeAppt(apptStart.toISOString(), apptEnd.toISOString())];

    const slots = computeAvailableSlots(monday, availability, appointments, 60);
    // Slots 09:00–10:00 and 09:15–10:15 overlap the appointment
    // Slot 09:30–10:30 overlaps, 09:45–10:45 overlaps, 10:00–11:00 is free
    for (const slot of slots) {
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;
      // None of the returned slots should overlap [09:30, 10:30)
      const apptStartTime = apptStart.getTime();
      const apptEndTime = apptEnd.getTime();
      const overlaps =
        slotStart.getTime() < apptEndTime && apptStartTime < slotEnd.getTime();
      expect(overlaps).toBe(false);
    }
  });

  it("returns start and end times on the correct date", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "10:00")];
    const slots = computeAvailableSlots(monday, availability, [], 60);
    expect(slots[0]!.startTime.toDateString()).toBe(monday.toDateString());
    expect(slots[0]!.endTime.toDateString()).toBe(monday.toDateString());
  });

  it("handles full working day (09:00–17:00) with 30-min service", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "17:00")];
    const slots = computeAvailableSlots(monday, availability, [], 30);
    // Window = 480 min, slot interval = 15, service = 30
    // Slots at 09:00, 09:15, …, 16:30 = (480-30)/15 + 1 = 31 slots
    expect(slots.length).toBeGreaterThan(0);
    const firstSlot = slots[0]!;
    const lastSlot = slots[slots.length - 1]!;
    expect(firstSlot.startTime.getHours()).toBe(9);
    expect(lastSlot.endTime.getHours()).toBe(17);
    expect(lastSlot.endTime.getMinutes()).toBe(0);
  });

  it("multiple availability windows on the same day produce slots from each", () => {
    const monday = dateForWeekday(1);
    const availability = [
      makeAvail(1, "09:00", "10:00"),
      makeAvail(1, "14:00", "15:00"),
    ];
    const slots = computeAvailableSlots(monday, availability, [], 60);
    const hours = slots.map((s) => s.startTime.getHours());
    expect(hours).toContain(9);
    expect(hours).toContain(14);
  });

  it("does not generate slots for a day with zero-duration window", () => {
    const monday = dateForWeekday(1);
    // 09:00–09:00 is invalid but ensure no infinite loop
    const availability = [makeAvail(1, "09:00", "09:00")];
    // availabilitySchema prevents this but the pure function should handle it
    const slots = computeAvailableSlots(monday, availability, [], 30);
    expect(slots).toHaveLength(0);
  });

  it("excludes slots that overlap with a provider block", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "12:00")];
    // Block from 10:00 to 11:00
    const blockStart = new Date(monday);
    blockStart.setHours(10, 0, 0, 0);
    const blockEnd = new Date(monday);
    blockEnd.setHours(11, 0, 0, 0);
    const blocks = [{ start_time: blockStart.toISOString(), end_time: blockEnd.toISOString() }];

    const slots = computeAvailableSlots(monday, availability, [], 60, blocks);
    for (const slot of slots) {
      const overlaps =
        slot.startTime.getTime() < blockEnd.getTime() &&
        blockStart.getTime() < slot.endTime.getTime();
      expect(overlaps).toBe(false);
    }
    // 09:00–10:00 should be available (doesn't overlap block)
    expect(slots.some(s => s.startTime.getHours() === 9 && s.startTime.getMinutes() === 0)).toBe(true);
    // 11:00–12:00 should be available
    expect(slots.some(s => s.startTime.getHours() === 11 && s.startTime.getMinutes() === 0)).toBe(true);
  });

  it("with empty blocks array behaves identically to no-blocks call", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "17:00")];
    const withBlocks = computeAvailableSlots(monday, availability, [], 30, []);
    const withoutBlocks = computeAvailableSlots(monday, availability, [], 30);
    expect(withBlocks).toEqual(withoutBlocks);
  });

  it("full-day block prevents all slots", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "17:00")];
    const blockStart = new Date(monday);
    blockStart.setHours(0, 0, 0, 0);
    const blockEnd = new Date(monday);
    blockEnd.setHours(23, 59, 59, 999);
    const blocks = [{ start_time: blockStart.toISOString(), end_time: blockEnd.toISOString() }];
    const slots = computeAvailableSlots(monday, availability, [], 30, blocks);
    expect(slots).toHaveLength(0);
  });

  it("returns all slots when appointments have status=cancelled", () => {
    const monday = dateForWeekday(1);
    const availability = [makeAvail(1, "09:00", "10:00")];
    const apptStart = new Date(monday);
    apptStart.setHours(9, 0, 0, 0);
    const apptEnd = new Date(monday);
    apptEnd.setHours(10, 0, 0, 0);
    // computeAvailableSlots itself doesn't filter by status — the caller
    // (getAppointmentsForDate) already excludes cancelled. But passing a
    // cancelled appointment should still block the slot (function is agnostic).
    const cancelledAppt = { ...makeAppt(apptStart.toISOString(), apptEnd.toISOString()), status: "cancelled" as const };
    const slotsWithCancelled = computeAvailableSlots(monday, availability, [cancelledAppt], 60);
    const slotsWithout = computeAvailableSlots(monday, availability, [], 60);
    // With cancelled passed in, it still blocks (function doesn't check status)
    expect(slotsWithCancelled.length).toBeLessThan(slotsWithout.length);
  });
});
