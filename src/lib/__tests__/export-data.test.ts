import { describe, it, expect } from "vitest";
import {
  buildExportFilename,
  buildExportPayload,
  type AppointmentExportRow,
  type ReviewExportRow,
  type SavedProviderExportRow,
} from "../export-data";

// ---------------------------------------------------------------------------
// buildExportFilename
// ---------------------------------------------------------------------------
describe("buildExportFilename", () => {
  it("produces the expected pattern for a given ISO date", () => {
    expect(buildExportFilename("2026-04-17")).toBe("mae-data-export-2026-04-17.json");
  });

  it("always starts with the hard-coded prefix", () => {
    const name = buildExportFilename("2025-01-01");
    expect(name.startsWith("mae-data-export-")).toBe(true);
  });

  it("ends with .json", () => {
    expect(buildExportFilename("2026-04-17").endsWith(".json")).toBe(true);
  });

  it("contains no user-controllable segments — only the provided ISO date", () => {
    const name = buildExportFilename("2026-04-17");
    // Exactly: prefix + date + extension
    expect(name).toBe("mae-data-export-2026-04-17.json");
  });
});

// ---------------------------------------------------------------------------
// buildExportPayload — structure
// ---------------------------------------------------------------------------

const AUTH_STUB = {
  email: "test@example.com",
  created_at: "2024-01-01T00:00:00Z",
  last_sign_in_at: "2026-04-17T10:00:00Z",
};

const PROFILE_STUB = {
  id: "user-1",
  email: "test@example.com",
  full_name: "Test User",
  phone: null,
  role: "user",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("buildExportPayload", () => {
  it("returns schema_version 1", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [],
      providerData: null,
    });
    expect(payload.schema_version).toBe(1);
  });

  it("returns appointments: [] for a customer with no appointments", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [],
      providerData: null,
    });
    expect(payload.appointments).toEqual([]);
    // Must be array, not undefined
    expect(Array.isArray(payload.appointments)).toBe(true);
  });

  it("preserves all appointment fields including enriched names", () => {
    const appt: AppointmentExportRow = {
      id: "appt-1",
      start_time: "2026-04-17T10:00:00Z",
      end_time: "2026-04-17T11:00:00Z",
      status: "completed",
      price_cents: 5000,
      notes: null,
      created_at: "2026-04-16T09:00:00Z",
      updated_at: "2026-04-17T11:05:00Z",
      service_name: "Haarschnitt",
      provider_business_name: "Salon Müller",
    };

    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [appt],
      reviews: [],
      savedProviders: [],
      providerData: null,
    });

    expect(payload.appointments).toHaveLength(1);
    expect(payload.appointments[0]).toEqual(appt);
  });

  it("does not expose customer email or name in provider_data appointments", () => {
    const providerData = {
      provider: { id: "prov-1", business_name: "Salon Test" },
      services: [],
      employees: [],
      availability: [],
      schedule_blocks: [],
      appointments_note:
        "Provider-side appointment records are not included in this export to protect the privacy of other customers.",
    };

    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [],
      providerData,
    });

    expect(payload.provider_data).not.toBeNull();
    // Appointments are omitted — only a note is present
    expect(payload.provider_data!.appointments_note).toContain("not included");
    // No customer PII fields present
    const provDataStr = JSON.stringify(payload.provider_data);
    expect(provDataStr).not.toContain("customer_email");
    expect(provDataStr).not.toContain("customer_name");
  });

  it("sets provider_data to null for a non-provider user", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [],
      providerData: null,
    });
    expect(payload.provider_data).toBeNull();
  });

  it("includes reviews_authored from the user", () => {
    const review: ReviewExportRow = {
      id: "rev-1",
      provider_id: "prov-1",
      appointment_id: "appt-1",
      rating: 5,
      comment: "Sehr gut!",
      created_at: "2026-04-17T12:00:00Z",
    };
    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [review],
      savedProviders: [],
      providerData: null,
    });
    expect(payload.reviews_authored).toHaveLength(1);
    expect(payload.reviews_authored[0]).toEqual(review);
  });

  it("includes saved_providers rows", () => {
    const saved: SavedProviderExportRow = {
      id: "sp-1",
      provider_id: "prov-1",
      created_at: "2026-01-10T08:00:00Z",
    };
    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [saved],
      providerData: null,
    });
    expect(payload.saved_providers).toHaveLength(1);
    expect(payload.saved_providers[0]).toEqual(saved);
  });

  it("auth block contains no password hash or secret fields", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-04-17T10:00:00Z",
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [],
      providerData: null,
    });
    const authKeys = Object.keys(payload.auth);
    expect(authKeys).not.toContain("encrypted_password");
    expect(authKeys).not.toContain("password");
    expect(authKeys).not.toContain("mfa_secret");
    // Only the three safe fields
    expect(authKeys.sort()).toEqual(["created_at", "email", "last_sign_in_at"].sort());
  });

  it("export_generated_at matches the value passed in", () => {
    const ts = "2026-04-17T10:00:00Z";
    const payload = buildExportPayload({
      exportedAt: ts,
      auth: AUTH_STUB,
      profile: PROFILE_STUB,
      appointments: [],
      reviews: [],
      savedProviders: [],
      providerData: null,
    });
    expect(payload.export_generated_at).toBe(ts);
  });
});
