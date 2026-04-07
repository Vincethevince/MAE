import { describe, it, expect } from "vitest";
import { sanitizeSubject, escapeHtml } from "../email-utils";

// ─── sanitizeSubject ──────────────────────────────────────────────────────────

describe("sanitizeSubject", () => {
  it("leaves a normal string unchanged", () => {
    expect(sanitizeSubject("Hello World")).toBe("Hello World");
  });

  it("removes newline characters", () => {
    expect(sanitizeSubject("Subject\nInjected")).toBe("SubjectInjected");
  });

  it("removes carriage return characters", () => {
    expect(sanitizeSubject("Subject\rInjected")).toBe("SubjectInjected");
  });

  it("removes both \\r and \\n in a CRLF sequence", () => {
    expect(sanitizeSubject("Subject\r\nInjected")).toBe("SubjectInjected");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeSubject("")).toBe("");
  });

  it("handles strings with only newlines", () => {
    expect(sanitizeSubject("\n\r\n")).toBe("");
  });
});

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a&b")).toBe("a&amp;b");
  });

  it("escapes less-than sign", () => {
    expect(escapeHtml("a<b")).toBe("a&lt;b");
  });

  it("escapes greater-than sign", () => {
    expect(escapeHtml("a>b")).toBe("a&gt;b");
  });

  it("escapes double quote", () => {
    expect(escapeHtml('a"b')).toBe("a&quot;b");
  });

  it("escapes single quote", () => {
    expect(escapeHtml("a'b")).toBe("a&#x27;b");
  });

  it("fully escapes an XSS payload", () => {
    expect(escapeHtml("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"
    );
  });

  it("leaves a string with no special characters unchanged", () => {
    expect(escapeHtml("Hello World 123")).toBe("Hello World 123");
  });

  it("returns empty string for empty input", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("handles all special characters together", () => {
    expect(escapeHtml('&<>"\''))
      .toBe("&amp;&lt;&gt;&quot;&#x27;");
  });
});
