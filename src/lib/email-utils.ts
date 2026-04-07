/** Strip CR and LF to prevent SMTP header injection. */
export function sanitizeSubject(str: string): string {
  return str.replace(/[\r\n]/g, "");
}

/** Escape HTML special characters for safe inclusion in email templates. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
