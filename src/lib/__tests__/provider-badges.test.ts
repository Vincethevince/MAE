import { describe, it, expect } from "vitest";
import { getProviderBadges } from "@/lib/provider-badges";

// Helper: build a created_at ISO string N days in the past
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ─── topRated badge ────────────────────────────────────────────────────────

describe("getProviderBadges — topRated", () => {
  it("awards topRated for rating 4.9 with 5+ reviews", () => {
    expect(getProviderBadges({ rating: 4.9, review_count: 6, created_at: daysAgo(120) })).toContain("topRated");
  });

  it("awards topRated at boundary: rating 4.8, exactly 5 reviews", () => {
    expect(getProviderBadges({ rating: 4.8, review_count: 5, created_at: daysAgo(120) })).toContain("topRated");
  });

  it("does NOT award topRated for rating 4.7 with 5+ reviews", () => {
    expect(getProviderBadges({ rating: 4.7, review_count: 6, created_at: daysAgo(120) })).not.toContain("topRated");
  });

  it("does NOT award topRated for rating 4.9 with only 4 reviews", () => {
    expect(getProviderBadges({ rating: 4.9, review_count: 4, created_at: daysAgo(120) })).not.toContain("topRated");
  });
});

// ─── popular badge ─────────────────────────────────────────────────────────

describe("getProviderBadges — popular", () => {
  it("awards popular for exactly 10 reviews", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 10, created_at: daysAgo(120) })).toContain("popular");
  });

  it("awards popular for more than 10 reviews", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 50, created_at: daysAgo(120) })).toContain("popular");
  });

  it("does NOT award popular for 9 reviews", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 9, created_at: daysAgo(120) })).not.toContain("popular");
  });
});

// ─── new badge ─────────────────────────────────────────────────────────────

describe("getProviderBadges — new", () => {
  it("awards new for a provider created 1 day ago", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 0, created_at: daysAgo(1) })).toContain("new");
  });

  it("awards new for a provider created 59 days ago", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 0, created_at: daysAgo(59) })).toContain("new");
  });

  it("does NOT award new for a provider created 61 days ago", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 0, created_at: daysAgo(61) })).not.toContain("new");
  });
});

// ─── combined & empty ──────────────────────────────────────────────────────

describe("getProviderBadges — combined and empty", () => {
  it("awards all three badges when all conditions are met", () => {
    const badges = getProviderBadges({ rating: 4.9, review_count: 10, created_at: daysAgo(1) });
    expect(badges).toContain("topRated");
    expect(badges).toContain("popular");
    expect(badges).toContain("new");
    expect(badges).toHaveLength(3);
  });

  it("returns empty array when no conditions are met", () => {
    expect(getProviderBadges({ rating: 3.0, review_count: 0, created_at: daysAgo(120) })).toEqual([]);
  });
});
