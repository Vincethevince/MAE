/**
 * Maps Supabase auth errors to i18n translation keys used in the register form.
 *
 * Exported separately so the logic can be unit-tested without importing
 * the Next.js "use server" action file (which requires a full Next.js runtime).
 */
export function mapSupabaseRegisterError(error: {
  message: string;
  code?: string;
  status?: number;
}): string {
  // Structured error codes (Supabase JS v2 AuthApiError.code)
  const code = error.code ?? "";
  if (code === "user_already_exists" || code === "email_exists") {
    return "emailAlreadyInUse";
  }
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit") {
    return "emailRateLimit";
  }
  if (code === "signup_disabled") {
    return "signupDisabled";
  }
  if (code === "weak_password") {
    return "passwordTooWeak";
  }
  if (code === "email_address_invalid" || code === "email_address_not_authorized") {
    return "emailInvalid";
  }
  // Database-level errors (trigger failures) surface as status 500 or code
  // "unexpected_failure". Migration 00014 prevents the trigger from ever raising
  // an exception, but this handles any other future DB-level failures.
  if (code === "unexpected_failure" || error.status === 500) {
    return "registrationServerError";
  }

  // Message-based fallbacks for older SDK versions / unexpected response shapes
  const msg = error.message.toLowerCase();
  if (
    msg.includes("already registered") ||
    msg.includes("email_exists") ||
    msg.includes("user already")
  ) {
    return "emailAlreadyInUse";
  }
  if (
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "emailRateLimit";
  }
  if (msg.includes("signup_disabled") || msg.includes("signups not allowed")) {
    return "signupDisabled";
  }
  if (
    msg.includes("password") &&
    (msg.includes("weak") || msg.includes("short") || msg.includes("characters"))
  ) {
    return "passwordTooWeak";
  }
  if (msg.includes("invalid email") || msg.includes("email_address_invalid")) {
    return "emailInvalid";
  }
  if (msg.includes("database error") || msg.includes("saving new user")) {
    return "registrationServerError";
  }
  return "registrationFailed";
}
