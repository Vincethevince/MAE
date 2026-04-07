"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "passwordMismatch",
  });

type ActionResult = { error: string } | { success: true };

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const raw = {
    fullName: formData.get("fullName")?.toString() ?? "",
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "validationError" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "unauthorized" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  if (updateError) {
    return { error: "saveFailed" };
  }

  const rawLocale = formData.get("locale")?.toString() ?? "de";
  const locale = ["de", "en"].includes(rawLocale) ? rawLocale : "de";
  revalidatePath(`/${locale}/profile`);
  return { success: true };
}

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const raw = {
    currentPassword: formData.get("currentPassword")?.toString() ?? "",
    newPassword: formData.get("newPassword")?.toString() ?? "",
    confirmPassword: formData.get("confirmPassword")?.toString() ?? "",
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const isMismatch = parsed.error.issues.some(
      (i) => i.path.includes("confirmPassword") && i.code === "custom"
    );
    return { error: isMismatch ? "passwordMismatch" : "validationError" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !user.email) return { error: "unauthorized" };

  // Re-authenticate with the current password before allowing the change.
  // This prevents session-hijacking attacks where an attacker with an
  // existing session changes the password without knowing the old one.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) return { error: "currentPasswordWrong" };

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (updateError) return { error: "saveFailed" };

  return { success: true };
}
