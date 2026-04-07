/** Format a Date as a UTC iCalendar DTSTAMP/DTSTART/DTEND value: YYYYMMDDTHHMMSSZ */
export function toIcsDateTime(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escape special characters in iCalendar text properties. */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/** Fold iCalendar lines at 75 octets per RFC 5545 §3.1 */
export function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let pos = 0;
  let first = true;

  while (pos < bytes.length) {
    const limit = first ? 75 : 74; // first line 75, continuation 74 (1 for the space)
    // Find a safe UTF-8 boundary
    let end = pos + limit;
    if (end >= bytes.length) {
      end = bytes.length;
    } else {
      // Retreat to a valid UTF-8 boundary
      while (end > pos && (bytes[end] & 0xc0) === 0x80) end--;
    }
    const chunk = new TextDecoder().decode(bytes.slice(pos, end));
    parts.push(first ? chunk : " " + chunk);
    pos = end;
    first = false;
  }

  return parts.join("\r\n");
}
