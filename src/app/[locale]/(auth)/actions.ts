"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";

export async function login(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const raw = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "invalidCredentials" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "invalidCredentials" };
  }

  redirect("/");
}

export async function register(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const raw = {
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
    fullName: formData.get("fullName")?.toString() ?? "",
    role: formData.get("role")?.toString() ?? "",
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const isPasswordMismatch = parsed.error.issues.some(
      (issue) => issue.path.includes("confirmPassword") && issue.code === "custom"
    );
    return { error: isPasswordMismatch ? "passwordMismatch" : "validationError" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
      },
    },
  });

  if (error) {
    return { error: "registrationFailed" };
  }

  redirect("/");
}

export async function requestPasswordReset(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const raw = { email: formData.get("email")?.toString() ?? "" };
  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) return { error: "validationError" };

  const locale = formData.get("locale")?.toString() ?? "de";
  const safeLocale = ["de", "en"].includes(locale) ? locale : "de";

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  const supabase = await createClient();
  // Always return success to prevent email enumeration attacks.
  // Supabase will silently no-op if the email doesn't exist.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/${safeLocale}/callback?next=/${safeLocale}/reset-password`,
  });

  return { success: true };
}

export async function updatePassword(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const raw = {
    password: formData.get("password")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  };

  const parsed = resetPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const isMismatch = parsed.error.issues.some(
      (i) => i.path.includes("confirmPassword") && i.code === "custom"
    );
    return { error: isMismatch ? "passwordMismatch" : "validationError" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: "updateFailed" };

  return { success: true };
}

export async function logout(): Promise<never> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    redirect("/login?error=logout_failed");
  }
  redirect("/login");
}
