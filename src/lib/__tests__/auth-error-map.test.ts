import { describe, it, expect } from "vitest";
import { mapSupabaseRegisterError } from "../auth-error-map";

describe("mapSupabaseRegisterError", () => {
  describe("structured error codes (Supabase v2 AuthApiError.code)", () => {
    it("maps user_already_exists to emailAlreadyInUse", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "user_already_exists" })).toBe("emailAlreadyInUse");
    });

    it("maps email_exists to emailAlreadyInUse", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "email_exists" })).toBe("emailAlreadyInUse");
    });

    it("maps over_email_send_rate_limit to emailRateLimit", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "over_email_send_rate_limit" })).toBe("emailRateLimit");
    });

    it("maps over_request_rate_limit to emailRateLimit", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "over_request_rate_limit" })).toBe("emailRateLimit");
    });

    it("maps signup_disabled to signupDisabled", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "signup_disabled" })).toBe("signupDisabled");
    });

    it("maps weak_password to passwordTooWeak", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "weak_password" })).toBe("passwordTooWeak");
    });

    it("maps email_address_invalid to emailInvalid", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "email_address_invalid" })).toBe("emailInvalid");
    });

    it("maps email_address_not_authorized to emailInvalid", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "email_address_not_authorized" })).toBe("emailInvalid");
    });

    it("maps unexpected_failure (trigger crash) to registrationServerError", () => {
      expect(mapSupabaseRegisterError({ message: "", code: "unexpected_failure" })).toBe("registrationServerError");
    });

    it("maps status 500 (DB trigger failure) to registrationServerError", () => {
      expect(mapSupabaseRegisterError({ message: "Something broke", status: 500 })).toBe("registrationServerError");
    });
  });

  describe("message-based fallbacks", () => {
    it("maps 'already registered' message to emailAlreadyInUse", () => {
      expect(mapSupabaseRegisterError({ message: "User already registered" })).toBe("emailAlreadyInUse");
    });

    it("maps 'user already' message to emailAlreadyInUse", () => {
      expect(mapSupabaseRegisterError({ message: "A user already exists" })).toBe("emailAlreadyInUse");
    });

    it("maps 'rate limit' message to emailRateLimit", () => {
      expect(mapSupabaseRegisterError({ message: "Email rate limit exceeded" })).toBe("emailRateLimit");
    });

    it("maps 'too many requests' message to emailRateLimit", () => {
      expect(mapSupabaseRegisterError({ message: "Too many requests" })).toBe("emailRateLimit");
    });

    it("maps 'signup_disabled' message to signupDisabled", () => {
      expect(mapSupabaseRegisterError({ message: "signup_disabled" })).toBe("signupDisabled");
    });

    it("maps 'signups not allowed' message to signupDisabled", () => {
      expect(mapSupabaseRegisterError({ message: "Signups not allowed for this instance" })).toBe("signupDisabled");
    });

    it("maps weak password message to passwordTooWeak", () => {
      expect(mapSupabaseRegisterError({ message: "Password should be at least 8 characters" })).toBe("passwordTooWeak");
    });

    it("maps invalid email message to emailInvalid", () => {
      expect(mapSupabaseRegisterError({ message: "Invalid email address" })).toBe("emailInvalid");
    });

    it("maps 'Database error saving new user' to registrationServerError", () => {
      expect(mapSupabaseRegisterError({ message: "Database error saving new user", status: 500 })).toBe("registrationServerError");
    });

    it("maps 'database error' message to registrationServerError", () => {
      expect(mapSupabaseRegisterError({ message: "database error occurred" })).toBe("registrationServerError");
    });

    it("maps 'saving new user' message to registrationServerError", () => {
      expect(mapSupabaseRegisterError({ message: "error saving new user" })).toBe("registrationServerError");
    });
  });

  describe("unknown errors", () => {
    it("returns registrationFailed for completely unknown errors", () => {
      expect(mapSupabaseRegisterError({ message: "Some unknown error" })).toBe("registrationFailed");
    });

    it("returns registrationFailed when message and code are empty", () => {
      expect(mapSupabaseRegisterError({ message: "" })).toBe("registrationFailed");
    });
  });
});
