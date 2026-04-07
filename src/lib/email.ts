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
  address?: string | null;
  customerName?: string | null;
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
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Dein Termin wurde bestätigt</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${escapeHtml(details.businessName)} hat deinen Termin bestätigt. Wir freuen uns auf deinen Besuch!</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Bitte erscheine pünktlich. Bei Absagen bis 24 Stunden vorher ist eine kostenlose Stornierung möglich.</p>
    ${primaryButton("Meine Termine anzeigen", `${APP_URL}/de/appointments`)}
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
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Terminerinnerung</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">Dein Termin bei ${escapeHtml(details.businessName)} findet morgen statt.</p>
    ${appointmentDetailsBlock(details)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">Bitte erscheine pünktlich. Bei Absagen bis 24 Stunden vorher ist eine kostenlose Stornierung möglich.</p>
    ${primaryButton("Meine Termine anzeigen", `${APP_URL}/de/appointments`)}
  `);

  await sendEmail({ to: customerEmail, subject, html });
}

// ─── Provider notifications ───────────────────────────────────────────────────

/**
 * Sent to the provider when a customer books a new appointment.
 */
export async function sendProviderNewBooking(
  providerEmail: string,
  details: EmailAppointmentDetails
): Promise<void> {
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
    <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Bitte bestätige oder lehne den Termin in deinem Dashboard ab.</p>
    ${primaryButton("Zum Dashboard", `${APP_URL}/de/dashboard/calendar`)}
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
