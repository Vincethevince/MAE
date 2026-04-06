import { describe, it, expect } from "vitest";
import {
  businessProfileSchema,
  serviceSchema,
  availabilitySchema,
  employeeSchema,
  PROVIDER_CATEGORIES,
} from "../validations/provider";
import { bookingSchema, reviewSchema } from "../validations/booking";
import { loginSchema, registerSchema } from "../validations/auth";

// ─── businessProfileSchema ─────────────────────────────────────────────────

describe("businessProfileSchema", () => {
  const valid = {
    businessName: "Friseur Müller",
    address: "Musterstraße 1",
    city: "Berlin",
    postalCode: "10115",
    phone: "",
    category: "friseur" as const,
    description: "",
    website: "",
  };

  it("accepts a complete valid profile", () => {
    expect(businessProfileSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects businessName shorter than 2 chars", () => {
    expect(businessProfileSchema.safeParse({ ...valid, businessName: "A" }).success).toBe(false);
  });

  it("rejects businessName longer than 100 chars", () => {
    expect(businessProfileSchema.safeParse({ ...valid, businessName: "A".repeat(101) }).success).toBe(false);
  });

  it("rejects invalid postal code (non-5-digit)", () => {
    expect(businessProfileSchema.safeParse({ ...valid, postalCode: "1234" }).success).toBe(false);
    expect(businessProfileSchema.safeParse({ ...valid, postalCode: "123456" }).success).toBe(false);
    expect(businessProfileSchema.safeParse({ ...valid, postalCode: "ABCDE" }).success).toBe(false);
  });

  it("accepts valid postal code", () => {
    expect(businessProfileSchema.safeParse({ ...valid, postalCode: "10115" }).success).toBe(true);
  });

  it("rejects phone shorter than 7 chars", () => {
    expect(businessProfileSchema.safeParse({ ...valid, phone: "+49123" }).success).toBe(false);
  });

  it("accepts empty phone (optional)", () => {
    expect(businessProfileSchema.safeParse({ ...valid, phone: "" }).success).toBe(true);
  });

  it("accepts valid international phone", () => {
    expect(businessProfileSchema.safeParse({ ...valid, phone: "+49 30 12345678" }).success).toBe(true);
  });

  it("rejects unknown category", () => {
    expect(businessProfileSchema.safeParse({ ...valid, category: "unknown" }).success).toBe(false);
  });

  it("accepts all known categories", () => {
    for (const cat of PROVIDER_CATEGORIES) {
      expect(businessProfileSchema.safeParse({ ...valid, category: cat }).success).toBe(true);
    }
  });

  it("rejects description longer than 500 chars", () => {
    expect(businessProfileSchema.safeParse({ ...valid, description: "A".repeat(501) }).success).toBe(false);
  });

  it("accepts empty website (optional)", () => {
    expect(businessProfileSchema.safeParse({ ...valid, website: "" }).success).toBe(true);
  });

  it("accepts valid https website URL", () => {
    expect(businessProfileSchema.safeParse({ ...valid, website: "https://example.com" }).success).toBe(true);
  });

  it("accepts valid http website URL", () => {
    expect(businessProfileSchema.safeParse({ ...valid, website: "http://example.com" }).success).toBe(true);
  });

  it("rejects javascript: URL scheme", () => {
    expect(businessProfileSchema.safeParse({ ...valid, website: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects non-URL website value", () => {
    expect(businessProfileSchema.safeParse({ ...valid, website: "not-a-url" }).success).toBe(false);
  });
});

// ─── serviceSchema ─────────────────────────────────────────────────────────

describe("serviceSchema", () => {
  const valid = {
    name: "Herrenhaarschnitt",
    description: "",
    durationMinutes: "60",
    priceCents: "4500",
    category: "friseur",
  };

  it("accepts valid service", () => {
    expect(serviceSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces string durationMinutes to number", () => {
    const result = serviceSchema.safeParse(valid);
    expect(result.success && result.data.durationMinutes).toBe(60);
  });

  it("rejects durationMinutes below 5", () => {
    expect(serviceSchema.safeParse({ ...valid, durationMinutes: "4" }).success).toBe(false);
  });

  it("rejects durationMinutes above 480", () => {
    expect(serviceSchema.safeParse({ ...valid, durationMinutes: "481" }).success).toBe(false);
  });

  it("rejects negative priceCents", () => {
    expect(serviceSchema.safeParse({ ...valid, priceCents: "-1" }).success).toBe(false);
  });

  it("accepts priceCents of 0 (free service)", () => {
    expect(serviceSchema.safeParse({ ...valid, priceCents: "0" }).success).toBe(true);
  });

  it("rejects priceCents above 10 million", () => {
    expect(serviceSchema.safeParse({ ...valid, priceCents: "10000001" }).success).toBe(false);
  });

  it("rejects name shorter than 2 chars", () => {
    expect(serviceSchema.safeParse({ ...valid, name: "A" }).success).toBe(false);
  });

  it("rejects empty category", () => {
    expect(serviceSchema.safeParse({ ...valid, category: "" }).success).toBe(false);
  });
});

// ─── availabilitySchema ────────────────────────────────────────────────────

describe("availabilitySchema", () => {
  const valid = { dayOfWeek: "1", startTime: "09:00", endTime: "17:00" };

  it("accepts valid availability", () => {
    expect(availabilitySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects dayOfWeek below 0", () => {
    expect(availabilitySchema.safeParse({ ...valid, dayOfWeek: "-1" }).success).toBe(false);
  });

  it("rejects dayOfWeek above 6", () => {
    expect(availabilitySchema.safeParse({ ...valid, dayOfWeek: "7" }).success).toBe(false);
  });

  it("accepts dayOfWeek 0 (Sunday)", () => {
    expect(availabilitySchema.safeParse({ ...valid, dayOfWeek: "0" }).success).toBe(true);
  });

  it("rejects invalid time format (hour 25)", () => {
    expect(availabilitySchema.safeParse({ ...valid, startTime: "25:00" }).success).toBe(false);
  });

  it("rejects invalid time format (minute 60)", () => {
    expect(availabilitySchema.safeParse({ ...valid, startTime: "09:60" }).success).toBe(false);
  });

  it("rejects invalid time format (99:99)", () => {
    expect(availabilitySchema.safeParse({ ...valid, startTime: "99:99" }).success).toBe(false);
  });

  it("accepts boundary time 23:59", () => {
    expect(availabilitySchema.safeParse({ ...valid, endTime: "23:59" }).success).toBe(true);
  });

  it("accepts boundary time 00:00", () => {
    expect(availabilitySchema.safeParse({ ...valid, startTime: "00:00" }).success).toBe(true);
  });

  it("rejects when endTime is not after startTime", () => {
    expect(availabilitySchema.safeParse({ ...valid, startTime: "17:00", endTime: "09:00" }).success).toBe(false);
    expect(availabilitySchema.safeParse({ ...valid, startTime: "09:00", endTime: "09:00" }).success).toBe(false);
  });

  it("accepts when endTime is exactly 1 minute after startTime", () => {
    expect(availabilitySchema.safeParse({ ...valid, startTime: "09:00", endTime: "09:01" }).success).toBe(true);
  });
});

// ─── employeeSchema ────────────────────────────────────────────────────────

describe("employeeSchema", () => {
  it("accepts valid name", () => {
    expect(employeeSchema.safeParse({ name: "Anna Schmidt" }).success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    expect(employeeSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    expect(employeeSchema.safeParse({ name: "A".repeat(101) }).success).toBe(false);
  });

  it("rejects empty name", () => {
    expect(employeeSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

// ─── bookingSchema ─────────────────────────────────────────────────────────

describe("bookingSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const futureTime = new Date(Date.now() + 86400000).toISOString();

  const valid = {
    providerId: validUUID,
    serviceId: validUUID,
    startTime: futureTime,
    notes: "",
  };

  it("accepts valid booking input", () => {
    expect(bookingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid providerId (not UUID)", () => {
    expect(bookingSchema.safeParse({ ...valid, providerId: "not-a-uuid" }).success).toBe(false);
  });

  it("rejects invalid serviceId (not UUID)", () => {
    expect(bookingSchema.safeParse({ ...valid, serviceId: "abc123" }).success).toBe(false);
  });

  it("rejects startTime in the past", () => {
    const pastTime = new Date(Date.now() - 86400000).toISOString();
    expect(bookingSchema.safeParse({ ...valid, startTime: pastTime }).success).toBe(false);
  });

  it("rejects non-ISO startTime", () => {
    expect(bookingSchema.safeParse({ ...valid, startTime: "2025-13-45 25:70" }).success).toBe(false);
  });

  it("rejects notes longer than 500 chars", () => {
    expect(bookingSchema.safeParse({ ...valid, notes: "A".repeat(501) }).success).toBe(false);
  });

  it("accepts booking without notes", () => {
    const { notes: _, ...withoutNotes } = valid;
    expect(bookingSchema.safeParse(withoutNotes).success).toBe(true);
  });
});

// ─── reviewSchema ──────────────────────────────────────────────────────────

describe("reviewSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const valid = {
    appointmentId: validUUID,
    rating: "5",
    comment: "Great service!",
  };

  it("accepts valid review", () => {
    expect(reviewSchema.safeParse(valid).success).toBe(true);
  });

  it("coerces rating string to number", () => {
    const result = reviewSchema.safeParse(valid);
    expect(result.success && result.data.rating).toBe(5);
  });

  it("rejects rating below 1", () => {
    expect(reviewSchema.safeParse({ ...valid, rating: "0" }).success).toBe(false);
  });

  it("rejects rating above 5", () => {
    expect(reviewSchema.safeParse({ ...valid, rating: "6" }).success).toBe(false);
  });

  it("rejects invalid appointmentId", () => {
    expect(reviewSchema.safeParse({ ...valid, appointmentId: "not-a-uuid" }).success).toBe(false);
  });

  it("accepts empty comment", () => {
    expect(reviewSchema.safeParse({ ...valid, comment: "" }).success).toBe(true);
  });

  it("rejects comment longer than 500 chars", () => {
    expect(reviewSchema.safeParse({ ...valid, comment: "A".repeat(501) }).success).toBe(false);
  });
});

// ─── loginSchema ──────────────────────────────────────────────────────────

describe("loginSchema", () => {
  const valid = { email: "user@example.com", password: "secret123!" };

  it("accepts valid login", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ ...valid, password: "" }).success).toBe(false);
  });
});

// ─── registerSchema ───────────────────────────────────────────────────────

describe("registerSchema", () => {
  const valid = {
    email: "user@example.com",
    password: "secret123",
    confirmPassword: "secret123",
    fullName: "Anna Schmidt",
    role: "user" as const,
  };

  it("accepts valid registration", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects fullName shorter than 2 chars", () => {
    expect(registerSchema.safeParse({ ...valid, fullName: "A" }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(registerSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });

  it("accepts role=provider", () => {
    expect(registerSchema.safeParse({ ...valid, role: "provider" }).success).toBe(true);
  });
});
