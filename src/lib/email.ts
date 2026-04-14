/**
 * Email notification service using Resend.
 *
 * Design principles:
 * - All email sending is fire-and-forget: failures are logged but never thrown.
 * - API key and from address are server-side only env vars (no NEXT_PUBLIC_).
 * - No user-controlled HTML is ever injected (XSS prevention).
 * - All appointment data comes from the database, not user input.
 */

import { Resend } from "resend";
import { sanitizeSubject, escapeHtml } from "@/lib/email-utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "MAE <noreply@makeappointmentseasier.com>";
const APP_NAME = "MAE – Make Appointments Easier";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://makeappointmentseasier.com";

function getResend(): Resend | null {
  if (!RESEND_API_KEY) {
    return null;
  }
  return new Resend(RESEND_API_KEY);
}

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

// ─── Base HTML template ───────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
      <!-- Header -->
      <tr>
        <td style="background:#18181b;padding:24px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${APP_NAME}</span>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:32px;">
          ${content}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:#f4f4f5;padding:16px 32px;border-top:1px solid #e4e4e7;">
          <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
            ${APP_NAME} &middot; <a href="${APP_URL}" style="color:#71717a;">${APP_URL}</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function appointmentDetailsBlock(details: EmailAppointmentDetails): string {
  return `<table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:20px 0;">
    <tr>
      <td style="padding:16px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;width:110px;vertical-align:top;">Dienstleister</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(details.businessName)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Leistung</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Datum</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${formatDate(details.startTime)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Uhrzeit</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${formatTime(details.startTime)} Uhr</td>
          </tr>
          ${details.address ? `
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Adresse</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.address)}</td>
          </tr>` : ""}
        </table>
      </td>
    </tr>
  </table>`;
}

function primaryButton(text: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#18181b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(text)}</a>`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailAppointmentDetails {
  appointmentId: string;
  businessName: string;
  serviceName: string;
  startTime: string; // ISO string
  durationMinutes?: number;
  address?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerNotes?: string | null;
}

/**
 * Builds a Google Calendar "add event" URL from appointment details.
 * Returns null if the start time cannot be parsed.
 * All values are encoded via URLSearchParams — no XSS risk.
 */
function buildGoogleCalendarUrl(details: EmailAppointmentDetails): string | null {
  const start = new Date(details.startTime);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (details.durationMinutes ?? 60) * 60_000);

  // Google Calendar format: YYYYMMDDTHHmmssZ
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${details.serviceName} bei ${details.businessName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `Termin gebucht über MAE – Make Appointments Easier\n${APP_URL}/de/appointments`,
    location: details.address ?? "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function secondaryButton(text: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:8px;margin-left:8px;padding:12px 24px;background:#ffffff;color:#18181b;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;border:1.5px solid #18181b;">${escapeHtml(text)}</a>`;
}

// ─── Send helper ─────────────────────────────────────────────────────────────

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    // Email service not configured — silently skip in dev/test
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }

  try {
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) {
      console.error("[email] Failed to send to", to, ":", error);
    }
  } catch (err) {
    console.error("[email] Unexpected error sending to", to, ":", err);
  }
}

// ─── Customer notifications ───────────────────────────────────────────────────

/**
 * Sent immediately after a customer books an appointment (status: pending).
 */
export async function sendBookingConfirmation(
  customerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const subject = `Buchungsanfrage erhalten – ${sanitizeSubject(details.businessName)}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Buchungsanfrage erhalten</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">Deine Buchungsanfrage wurde erfolgreich übermittelt und wartet auf Bestätigung durch den Dienstleister.</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Du erhältst eine weitere E-Mail, sobald dein Termin bestätigt wurde.</p>
    ${primaryButton("Meine Termine anzeigen", `${APP_URL}/de/appointments`)}
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

/**
 * Sent when a provider confirms a pending appointment.
 */
export async function sendAppointmentConfirmed(
  customerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const subject = `Termin bestätigt – ${sanitizeSubject(details.businessName)}`;
  const calUrl = buildGoogleCalendarUrl(details);
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Dein Termin wurde bestätigt</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${escapeHtml(details.businessName)} hat deinen Termin bestätigt. Wir freuen uns auf deinen Besuch!</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Bitte erscheine pünktlich. Bei Absagen bis 24 Stunden vorher ist eine kostenlose Stornierung möglich.</p>
    <div style="margin-top:16px;">
      ${primaryButton("Meine Termine anzeigen", `${APP_URL}/de/appointments`)}
      ${calUrl ? secondaryButton("In Google Kalender eintragen", calUrl) : ""}
    </div>
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

/**
 * Sent when a customer cancels their own appointment.
 */
export async function sendCancellationByCustomer(
  customerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const subject = `Termin storniert – ${sanitizeSubject(details.businessName)}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Termin storniert</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">Dein Termin wurde erfolgreich storniert.</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Du kannst jederzeit einen neuen Termin buchen.</p>
    ${primaryButton("Neuen Termin buchen", `${APP_URL}/de/search`)}
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

/**
 * Sent when a provider cancels an appointment.
 */
export async function sendCancellationByProvider(
  customerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const subject = `Termin abgesagt – ${sanitizeSubject(details.businessName)}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Dein Termin wurde abgesagt</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">Leider wurde dein Termin bei ${escapeHtml(details.businessName)} vom Dienstleister abgesagt.</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Du kannst gerne einen neuen Termin buchen oder einen anderen Dienstleister wählen.</p>
    ${primaryButton("Neuen Termin buchen", `${APP_URL}/de/search`)}
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

/**
 * Sent ~24 hours before the appointment as a reminder.
 */
export async function sendAppointmentReminder(
  customerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const subject = `Erinnerung: Dein Termin morgen bei ${sanitizeSubject(details.businessName)}`;
  const calUrl = buildGoogleCalendarUrl(details);
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Terminerinnerung</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">Dein Termin bei ${escapeHtml(details.businessName)} findet morgen statt.</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Bitte erscheine pünktlich. Bei Absagen bis 24 Stunden vorher ist eine kostenlose Stornierung möglich.</p>
    <div style="margin-top:16px;">
      ${primaryButton("Meine Termine anzeigen", `${APP_URL}/de/appointments`)}
      ${calUrl ? secondaryButton("In Google Kalender eintragen", calUrl) : ""}
    </div>
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

// ─── Provider notifications ───────────────────────────────────────────────────

/**
 * Sent to the provider when a customer books a new appointment.
 */
export async function sendProviderNewBooking(
  providerEmail: string,
  details: EmailAppointmentDetails,
  locale = "de"
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";
  const subject = `Neue Buchungsanfrage – ${sanitizeSubject(details.serviceName)}`;
  const appointmentTime = formatDateTime(details.startTime);
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Neue Buchungsanfrage</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">
      ${details.customerName ? `<strong>${escapeHtml(details.customerName)}</strong> hat` : "Ein Kunde hat"} eine neue Buchungsanfrage für <strong>${escapeHtml(details.serviceName)}</strong> gestellt.
    </p>
    <table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:100px;vertical-align:top;">Kunde</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${details.customerName ? escapeHtml(details.customerName) : "—"}</td>
            </tr>
            ${details.customerPhone ? `<tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Telefon</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.customerPhone)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Leistung</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Termin</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${appointmentTime} Uhr</td>
            </tr>
            ${details.customerNotes ? `<tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Notiz</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;font-style:italic;">&ldquo;${escapeHtml(details.customerNotes)}&rdquo;</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Bitte bestätige oder lehne den Termin in deinem Dashboard ab.</p>
    ${primaryButton("Zum Dashboard", `${APP_URL}/${safeLocale}/dashboard/calendar`)}
  `);

  await sendEmail({ to: providerEmail, subject, html });
}

/**
 * Sent to the provider when a customer cancels their appointment.
 */
export async function sendProviderCancellationAlert(
  providerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const appointmentTime = formatDateTime(details.startTime);
  const subject = `Termin storniert – ${sanitizeSubject(details.serviceName)} am ${new Date(details.startTime).toLocaleDateString("de-DE")}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Termin wurde storniert</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">
      ${details.customerName ? `<strong>${escapeHtml(details.customerName)}</strong> hat` : "Ein Kunde hat"} den folgenden Termin storniert:
    </p>
    <table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:100px;">Kunde</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${details.customerName ? escapeHtml(details.customerName) : "—"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Leistung</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Termin</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${appointmentTime} Uhr</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${primaryButton("Kalender ansehen", `${APP_URL}/de/dashboard/calendar`)}
  `);

  await sendEmail({ to: providerEmail, subject, html });
}

/**
 * Sent to the provider ~24 hours before an upcoming appointment as a reminder.
 */
export async function sendProviderAppointmentReminder(
  providerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
  const appointmentTime = formatDateTime(details.startTime);
  const subject = `Morgen: Termin mit ${details.customerName ? sanitizeSubject(details.customerName) : "Kunde"} – ${sanitizeSubject(details.serviceName)}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Erinnerung: Termin morgen</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">
      Du hast morgen folgenden Termin:
    </p>
    <table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:100px;">Kunde</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${details.customerName ? escapeHtml(details.customerName) : "—"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Leistung</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;">Uhrzeit</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${appointmentTime} Uhr</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${primaryButton("Kalender öffnen", `${APP_URL}/de/dashboard/calendar`)}
  `);

  await sendEmail({ to: providerEmail, subject, html });
}

// ─── Review request ────────────────────────────────────────────────────────────

export async function sendReviewRequest(
  customerEmail: string,
  details: {
    appointmentId: string;
    businessName: string;
    serviceName: string;
    startTime: string;
    locale?: string;
  }
): Promise<void> {
  const appointmentDate = formatDate(details.startTime);
  const safeLocale = ["de", "en"].includes(details.locale ?? "") ? details.locale : "de";
  const reviewUrl = `${APP_URL}/${safeLocale}/appointments`;
  const subject = `Wie war dein Besuch bei ${sanitizeSubject(details.businessName)}?`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Wie war dein Termin?</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      Du warst am <strong>${appointmentDate}</strong> bei <strong>${escapeHtml(details.businessName)}</strong>
      für <strong>${escapeHtml(details.serviceName)}</strong>. Hinterlasse eine Bewertung und hilf anderen Nutzern dabei,
      den richtigen Anbieter zu finden.
    </p>
    ${primaryButton("Jetzt bewerten", reviewUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
      Du erhältst diese E-Mail, weil du kürzlich einen Termin über MAE gebucht hast.
    </p>
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

/**
 * Sent to the provider when a customer submits a new review.
 * Allows providers to react quickly — especially to negative feedback.
 */
export async function sendProviderNewReview(
  providerEmail: string,
  details: {
    businessName: string;
    serviceName: string;
    customerName: string | null;
    rating: number;        // 1–5
    comment: string | null;
    locale?: string;       // used to build the dashboard link — always validated internally
  }
): Promise<void> {
  // Build the dashboard link from APP_URL + a validated locale path — never
  // accept an arbitrary URL from callers to prevent open-redirect / JS-URI risks.
  const safeLocale = ["de", "en"].includes(details.locale ?? "") ? details.locale : "de";
  const reviewsUrl = `${APP_URL}/${safeLocale}/dashboard/reviews`;

  const stars = "★".repeat(Math.max(1, Math.min(5, details.rating))) +
                "☆".repeat(Math.max(0, 5 - details.rating));
  const subject = `Neue Bewertung für ${sanitizeSubject(details.businessName)} – ${details.rating}/5 Sterne`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Neue Kundenbewertung</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#3f3f46;">
      ${details.customerName ? `<strong>${escapeHtml(details.customerName)}</strong> hat` : "Ein Kunde hat"}
      eine neue Bewertung für <strong>${escapeHtml(details.businessName)}</strong> abgegeben.
    </p>
    <table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:0 0 20px;">
      <tr>
        <td style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:100px;vertical-align:top;">Leistung</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Bewertung</td>
              <td style="padding:4px 0;font-size:16px;color:#f59e0b;">${stars} <span style="font-size:13px;color:#18181b;">(${details.rating}/5)</span></td>
            </tr>
            ${details.comment ? `<tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Kommentar</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;font-style:italic;">&ldquo;${escapeHtml(details.comment)}&rdquo;</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    ${primaryButton("Bewertung ansehen & antworten", reviewsUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
      Du kannst direkt in deinem Dashboard auf die Bewertung antworten.
    </p>
  `);

  await sendEmail({ to: providerEmail, subject, html });
}
