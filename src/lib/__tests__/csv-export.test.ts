/**
 * Tests for the CSV cell sanitisation logic used in the appointments export.
 *
 * The implementation lives inside the API route handler and is not currently
 * exported, so we duplicate the function here for unit testing. If the
 * implementation changes, update this copy accordingly.
 */

import { describe, it, expect } from "vitest";

/** Mirror of the csvCell function in the export route. */
function csvCell(value: string | null | undefined): string {
  const str = value == null ? "" : String(value);
  // CSV injection guard: prefix formula-starting characters with a tab
  const safe = /^[=+\-@|]/.test(str) ? `\t${str}` : str;
  // Wrap in double quotes and escape embedded double quotes
  return `"${safe.replace(/"/g, '""')}"`;
}

describe("csvCell", () => {
  it("wraps plain strings in double quotes", () => {
    expect(csvCell("hello")).toBe('"hello"');
  });

  it("returns empty string for null", () => {
    expect(csvCell(null)).toBe('""');
  });

  it("returns empty string for undefined", () => {
    expect(csvCell(undefined)).toBe('""');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("handles values containing commas (no escaping needed beyond quoting)", () => {
    expect(csvCell("Müller, Hans")).toBe('"Müller, Hans"');
  });

  it("handles values containing newlines", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("prefixes = with tab to prevent formula injection", () => {
    expect(csvCell("=SUM(A1:A10)")).toBe('"\t=SUM(A1:A10)"');
  });

  it("prefixes + with tab to prevent formula injection", () => {
    expect(csvCell("+1234567890")).toBe('"\t+1234567890"');
  });

  it("prefixes - with tab to prevent formula injection", () => {
    expect(csvCell("-1234567890")).toBe('"\t-1234567890"');
  });

  it("prefixes @ with tab to prevent formula injection", () => {
    expect(csvCell("@admin")).toBe('"\t@admin"');
  });

  it("prefixes | with tab to prevent formula injection", () => {
    expect(csvCell("|pipe")).toBe('"\t|pipe"');
  });

  it("does NOT prefix values that merely contain = but don't start with it", () => {
    expect(csvCell("a=b")).toBe('"a=b"');
  });

  it("handles numeric values passed as strings", () => {
    expect(csvCell("42.50")).toBe('"42.50"');
  });

  it("handles Unicode characters", () => {
    expect(csvCell("Müller & Söhne GmbH")).toBe('"Müller & Söhne GmbH"');
  });
});
