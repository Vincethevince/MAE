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

function formatDateTime(isoString: string, locale = "de"): string {
  return new Date(isoString).toLocaleString(locale === "en" ? "en-GB" : "de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function formatDate(isoString: string, locale = "de"): string {
  return new Date(isoString).toLocaleDateString(locale === "en" ? "en-GB" : "de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Europe/Berlin",
  });
}

function formatTime(isoString: string, locale = "de"): string {
  return new Date(isoString).toLocaleTimeString(locale === "en" ? "en-GB" : "de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

// ─── Base HTML template ───────────────────────────────────────────────────────

function baseTemplate(content: string, locale = "de"): string {
  return `<!DOCTYPE html>
<html lang="${locale === "en" ? "en" : "de"}">
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

function appointmentDetailsBlock(details: EmailAppointmentDetails, locale = "de"): string {
  const L = locale === "en" ? {
    provider: "Provider", service: "Service", date: "Date", time: "Time", address: "Address"
  } : {
    provider: "Dienstleister", service: "Leistung", date: "Datum", time: "Uhrzeit", address: "Adresse"
  };

  const timeDisplay = locale === "en" ? formatTime(details.startTime, "en") : `${formatTime(details.startTime, "de")} Uhr`;

  return `<table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:20px 0;">
    <tr>
      <td style="padding:16px 20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;width:110px;vertical-align:top;">${L.provider}</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${escapeHtml(details.businessName)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${L.service}</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${L.date}</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${formatDate(details.startTime, locale)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${L.time}</td>
            <td style="padding:4px 0;font-size:13px;color:#18181b;">${timeDisplay}</td>
          </tr>
          ${details.address ? `
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${L.address}</td>
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
function buildGoogleCalendarUrl(details: EmailAppointmentDetails, locale = "de"): string | null {
  const start = new Date(details.startTime);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (details.durationMinutes ?? 60) * 60_000);

  // Google Calendar format: YYYYMMDDTHHmmssZ
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const text = locale === "en"
    ? `${details.serviceName} at ${details.businessName}`
    : `${details.serviceName} bei ${details.businessName}`;

  const detailsText = locale === "en"
    ? `Appointment booked via MAE – Make Appointments Easier\n${APP_URL}/en/appointments`
    : `Termin gebucht über MAE – Make Appointments Easier\n${APP_URL}/de/appointments`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: detailsText,
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
  details: EmailAppointmentDetails,
  locale = "de"
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";

  const translations = safeLocale === "en" ? {
    subject: `Booking request received – ${sanitizeSubject(details.businessName)}`,
    heading: "Booking request received",
    p1: "Your booking request has been successfully submitted and is awaiting confirmation from the provider.",
    p2: "You'll receive another email once your appointment has been confirmed.",
    button: "View my appointments",
  } : {
    subject: `Buchungsanfrage erhalten – ${sanitizeSubject(details.businessName)}`,
    heading: "Buchungsanfrage erhalten",
    p1: "Deine Buchungsanfrage wurde erfolgreich übermittelt und wartet auf Bestätigung durch den Dienstleister.",
    p2: "Du erhältst eine weitere E-Mail, sobald dein Termin bestätigt wurde.",
    button: "Meine Termine anzeigen",
  };

  const url = `${APP_URL}/${safeLocale}/appointments`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${translations.p1}</p>
    ${appointmentDetailsBlock(details, safeLocale)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">${translations.p2}</p>
    ${primaryButton(translations.button, url)}
  `, safeLocale);

  await sendEmail({ to: customerEmail, subject: translations.subject, html });
}

/**
 * Sent when a provider confirms a pending appointment.
 */
export async function sendAppointmentConfirmed(
  customerEmail: string,
  details: EmailAppointmentDetails,
  locale = "de"
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";

  const translations = safeLocale === "en" ? {
    subject: `Appointment confirmed – ${sanitizeSubject(details.businessName)}`,
    heading: "Your appointment is confirmed",
    p1: `${escapeHtml(details.businessName)} has confirmed your appointment. We look forward to seeing you!`,
    p2: "Please arrive on time. Free cancellation is available up to 24 hours before your appointment.",
    button: "View my appointments",
    calButton: "Add to Google Calendar",
  } : {
    subject: `Termin bestätigt – ${sanitizeSubject(details.businessName)}`,
    heading: "Dein Termin wurde bestätigt",
    p1: `${escapeHtml(details.businessName)} hat deinen Termin bestätigt. Wir freuen uns auf deinen Besuch!`,
    p2: "Bitte erscheine pünktlich. Bei Absagen bis 24 Stunden vorher ist eine kostenlose Stornierung möglich.",
    button: "Meine Termine anzeigen",
    calButton: "In Google Kalender eintragen",
  };

  const calUrl = buildGoogleCalendarUrl(details, safeLocale);
  const url = `${APP_URL}/${safeLocale}/appointments`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${translations.p1}</p>
    ${appointmentDetailsBlock(details, safeLocale)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">${translations.p2}</p>
    <div style="margin-top:16px;">
      ${primaryButton(translations.button, url)}
      ${calUrl ? secondaryButton(translations.calButton, calUrl) : ""}
    </div>
  `, safeLocale);

  await sendEmail({ to: customerEmail, subject: translations.subject, html });
}

/**
 * Sent when a customer cancels their own appointment.
 */
export async function sendCancellationByCustomer(
  customerEmail: string,
  details: EmailAppointmentDetails,
  locale = "de"
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";

  const translations = safeLocale === "en" ? {
    subject: `Appointment cancelled – ${sanitizeSubject(details.businessName)}`,
    heading: "Appointment cancelled",
    p1: "Your appointment has been successfully cancelled.",
    p2: "You can book a new appointment at any time.",
    button: "Book a new appointment",
  } : {
    subject: `Termin storniert – ${sanitizeSubject(details.businessName)}`,
    heading: "Termin storniert",
    p1: "Dein Termin wurde erfolgreich storniert.",
    p2: "Du kannst jederzeit einen neuen Termin buchen.",
    button: "Neuen Termin buchen",
  };

  const url = `${APP_URL}/${safeLocale}/search`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${translations.p1}</p>
    ${appointmentDetailsBlock(details, safeLocale)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">${translations.p2}</p>
    ${primaryButton(translations.button, url)}
  `, safeLocale);

  await sendEmail({ to: customerEmail, subject: translations.subject, html });
}

/**
 * Sent when a provider cancels an appointment.
 */
export async function sendCancellationByProvider(
  customerEmail: string,
  details: EmailAppointmentDetails,
  locale = "de"
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";

  const translations = safeLocale === "en" ? {
    subject: `Appointment cancelled – ${sanitizeSubject(details.businessName)}`,
    heading: "Your appointment has been cancelled",
    p1: `Unfortunately your appointment at ${escapeHtml(details.businessName)} has been cancelled by the provider.`,
    p2: "You're welcome to book a new appointment or choose a different provider.",
    button: "Book a new appointment",
  } : {
    subject: `Termin abgesagt – ${sanitizeSubject(details.businessName)}`,
    heading: "Dein Termin wurde abgesagt",
    p1: `Leider wurde dein Termin bei ${escapeHtml(details.businessName)} vom Dienstleister abgesagt.`,
    p2: "Du kannst gerne einen neuen Termin buchen oder einen anderen Dienstleister wählen.",
    button: "Neuen Termin buchen",
  };

  const url = `${APP_URL}/${safeLocale}/search`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${translations.p1}</p>
    ${appointmentDetailsBlock(details, safeLocale)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">${translations.p2}</p>
    ${primaryButton(translations.button, url)}
  `, safeLocale);

  await sendEmail({ to: customerEmail, subject: translations.subject, html });
}

/**
 * Sent ~24 hours before the appointment as a reminder.
 */
export async function sendAppointmentReminder(
  customerEmail: string,
  details: EmailAppointmentDetails,
  locale = "de"
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";

  const translations = safeLocale === "en" ? {
    subject: `Reminder: Your appointment tomorrow at ${sanitizeSubject(details.businessName)}`,
    heading: "Appointment reminder",
    p1: `Your appointment at ${escapeHtml(details.businessName)} is tomorrow.`,
    p2: "Please arrive on time. Free cancellation is available up to 24 hours before your appointment.",
    button: "View my appointments",
    calButton: "Add to Google Calendar",
  } : {
    subject: `Erinnerung: Dein Termin morgen bei ${sanitizeSubject(details.businessName)}`,
    heading: "Terminerinnerung",
    p1: `Dein Termin bei ${escapeHtml(details.businessName)} findet morgen statt.`,
    p2: "Bitte erscheine pünktlich. Bei Absagen bis 24 Stunden vorher ist eine kostenlose Stornierung möglich.",
    button: "Meine Termine anzeigen",
    calButton: "In Google Kalender eintragen",
  };

  const calUrl = buildGoogleCalendarUrl(details, safeLocale);
  const url = `${APP_URL}/${safeLocale}/appointments`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 4px;font-size:14px;color:#3f3f46;">${translations.p1}</p>
    ${appointmentDetailsBlock(details, safeLocale)}
    <p style="margin:16px 0 4px;font-size:14px;color:#3f3f46;">${translations.p2}</p>
    <div style="margin-top:16px;">
      ${primaryButton(translations.button, url)}
      ${calUrl ? secondaryButton(translations.calButton, calUrl) : ""}
    </div>
  `, safeLocale);

  await sendEmail({ to: customerEmail, subject: translations.subject, html });
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
  const appointmentTime = formatDateTime(details.startTime, safeLocale);
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
  const safeLocale = ["de", "en"].includes(details.locale ?? "") ? details.locale : "de";
  const appointmentDate = formatDate(details.startTime, safeLocale);

  const translations = safeLocale === "en" ? {
    subject: `How was your visit to ${sanitizeSubject(details.businessName)}?`,
    heading: "How was your appointment?",
    p: `You visited <strong>${escapeHtml(details.businessName)}</strong> on <strong>${appointmentDate}</strong> for <strong>${escapeHtml(details.serviceName)}</strong>. Leave a review and help others find the right provider.`,
    button: "Write a review",
    footer: "You're receiving this email because you recently made a booking via MAE.",
  } : {
    subject: `Wie war dein Besuch bei ${sanitizeSubject(details.businessName)}?`,
    heading: "Wie war dein Termin?",
    p: `Du warst am <strong>${appointmentDate}</strong> bei <strong>${escapeHtml(details.businessName)}</strong> für <strong>${escapeHtml(details.serviceName)}</strong>. Hinterlasse eine Bewertung und hilf anderen Nutzern dabei, den richtigen Anbieter zu finden.`,
    button: "Jetzt bewerten",
    footer: "Du erhältst diese E-Mail, weil du kürzlich einen Termin über MAE gebucht hast.",
  };

  const reviewUrl = `${APP_URL}/${safeLocale}/appointments`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      ${translations.p}
    </p>
    ${primaryButton(translations.button, reviewUrl)}
    <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">
      ${translations.footer}
    </p>
  `, safeLocale);

  await sendEmail({ to: customerEmail, subject: translations.subject, html });
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

// ─── Reschedule notifications ─────────────────────────────────────────────────

/**
 * Sent to the customer when they reschedule their appointment.
 * Shows the old time and the new time side by side.
 */
export async function sendRescheduleConfirmation(
  to: string,
  details: EmailAppointmentDetails & { oldStartTime: string },
  locale?: string
): Promise<void> {
  const safeLocale = ["de", "en"].includes(locale ?? "") ? (locale as string) : "de";

  const translations = safeLocale === "en" ? {
    subject: `Appointment rescheduled – ${sanitizeSubject(details.businessName)}`,
    heading: "Appointment rescheduled",
    p1: "Your appointment has been successfully rescheduled.",
    oldLabel: "Previous time",
    newLabel: "New time",
    p2: "Your appointment is pending re-confirmation by the provider.",
    button: "View my appointments",
  } : {
    subject: `Termin umgebucht – ${sanitizeSubject(details.businessName)}`,
    heading: "Termin erfolgreich umgebucht",
    p1: "Ihr Termin wurde erfolgreich umgebucht.",
    oldLabel: "Alter Termin",
    newLabel: "Neuer Termin",
    p2: "Ihr Termin wartet auf erneute Bestätigung durch den Dienstleister.",
    button: "Meine Termine anzeigen",
  };

  const oldTimeDisplay = safeLocale === "en"
    ? formatDateTime(details.oldStartTime, "en")
    : `${formatDateTime(details.oldStartTime, "de")} Uhr`;
  const newTimeDisplay = safeLocale === "en"
    ? formatDateTime(details.startTime, "en")
    : `${formatDateTime(details.startTime, "de")} Uhr`;

  const url = `${APP_URL}/${safeLocale}/appointments`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">${translations.heading}</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">${translations.p1}</p>
    <table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:0 0 16px;">
      <tr>
        <td style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:120px;vertical-align:top;">${translations.oldLabel}</td>
              <td style="padding:4px 0;font-size:13px;color:#71717a;text-decoration:line-through;">${oldTimeDisplay}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${translations.newLabel}</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${newTimeDisplay}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${safeLocale === "en" ? "Provider" : "Dienstleister"}</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.businessName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${safeLocale === "en" ? "Service" : "Leistung"}</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
            </tr>
            ${details.address ? `<tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">${safeLocale === "en" ? "Address" : "Adresse"}</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.address)}</td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">${translations.p2}</p>
    ${primaryButton(translations.button, url)}
  `, safeLocale);

  await sendEmail({ to, subject: translations.subject, html });
}

/**
 * Sent to the provider when a customer reschedules an appointment.
 */
export async function sendProviderRescheduleAlert(
  to: string,
  details: EmailAppointmentDetails & { oldStartTime: string; customerName: string | null }
): Promise<void> {
  const oldTimeDisplay = formatDateTime(details.oldStartTime, "de");
  const newTimeDisplay = formatDateTime(details.startTime, "de");
  const customerDisplay = details.customerName ? sanitizeSubject(details.customerName) : "Kunde";
  const subject = `Termin umgebucht – ${customerDisplay}`;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Termin wurde umgebucht</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      ${details.customerName ? `<strong>${escapeHtml(details.customerName)}</strong> hat` : "Ein Kunde hat"} einen Termin umgebucht.
    </p>
    <table style="width:100%;background:#f9fafb;border-radius:6px;border:1px solid #e4e4e7;border-collapse:collapse;margin:0 0 16px;">
      <tr>
        <td style="padding:16px 20px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:120px;vertical-align:top;">Kunde</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${details.customerName ? escapeHtml(details.customerName) : "—"}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Leistung</td>
              <td style="padding:4px 0;font-size:13px;color:#18181b;">${escapeHtml(details.serviceName)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Alter Termin</td>
              <td style="padding:4px 0;font-size:13px;color:#71717a;text-decoration:line-through;">${oldTimeDisplay} Uhr</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;vertical-align:top;">Neuer Termin</td>
              <td style="padding:4px 0;font-size:13px;font-weight:600;color:#18181b;">${newTimeDisplay} Uhr</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;">Bitte bestätige den neuen Termin in deinem Dashboard.</p>
    ${primaryButton("Zum Dashboard", `${APP_URL}/de/dashboard/calendar`)}
  `);

  await sendEmail({ to, subject, html });
}

// ─── Provider onboarding ──────────────────────────────────────────────────────

/**
 * Sent once when a provider accesses their dashboard for the first time.
 * German-only — providers are German-market-focused.
 */
export async function sendProviderWelcome(
  to: string,
  details: {
    businessName: string;
    dashboardUrl: string;
  }
): Promise<void> {
  const subject = `Willkommen bei MAE – ${sanitizeSubject(details.businessName)}`;
  const safeName = escapeHtml(details.businessName);
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#18181b;">Herzlich willkommen bei MAE!</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;">
      Dein Anbieterprofil <strong>${safeName}</strong> ist jetzt aktiv. Folge diesen Schritten, um deinen ersten Termin zu erhalten:
    </p>
    <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#3f3f46;line-height:1.8;">
      <li style="margin-bottom:8px;"><strong>Profil vervollständigen</strong> — Füge dein Logo, eine Beschreibung und deine Adresse hinzu</li>
      <li style="margin-bottom:8px;"><strong>Dienstleistungen anlegen</strong> — Definiere deine Angebote mit Preis und Dauer</li>
      <li style="margin-bottom:8px;"><strong>Verfügbarkeit eintragen</strong> — Lege deine Öffnungszeiten fest</li>
      <li style="margin-bottom:8px;"><strong>Sichtbar werden</strong> — Dein Profil erscheint in der Suche, sobald du mindestens eine Dienstleistung und Verfügbarkeit hast</li>
    </ol>
    ${primaryButton("Zum Dashboard", details.dashboardUrl)}
  `);

  await sendEmail({ to, subject, html });
}
