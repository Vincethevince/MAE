"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations/auth";

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
    phone: formData.get("phone")?.toString() ?? "",
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
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
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

export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const confirmation = formData.get("confirmation")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  // Require the user to type "löschen" to confirm
  if (confirmation.toLowerCase().trim() !== "löschen") {
    return { error: "confirmationRequired" };
  }

  if (!password) {
    return { error: "passwordRequired" };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return { error: "unauthorized" };
  }

  // Re-authenticate before deletion to prevent session-hijacking attacks
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInError) {
    return { error: "currentPasswordWrong" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // 1. Cancel all upcoming pending/confirmed appointments (capped at 50 to prevent serverless timeout)
  // (historical/completed ones remain, anonymized by the FK SET NULL cascade)
  const now = new Date().toISOString();
  const { data: upcomingAppts } = await db
    .from("appointments")
    .select("id, provider_id, service_id, start_time")
    .eq("user_id", user.id)
    .in("status", ["pending", "confirmed"])
    .gt("start_time", now)
    .limit(50);

  if (upcomingAppts && upcomingAppts.length > 0) {
    await db
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed"])
      .gt("start_time", now);

    // Notify providers of cancellations in parallel (best-effort, non-blocking)
    const { sendProviderCancellationAlert } = await import("@/lib/email");

    await Promise.allSettled(
      upcomingAppts.map(async (appt: { id: string; provider_id: string; service_id: string; start_time: string }) => {
        const [providerResult, serviceResult] = await Promise.allSettled([
          db.from("providers").select("business_name, address, city, profile_id").eq("id", appt.provider_id).single(),
          db.from("services").select("name").eq("id", appt.service_id).single(),
        ]);

        const providerData = providerResult.status === "fulfilled"
          ? (providerResult.value.data as { business_name?: string; address?: string | null; city?: string | null; profile_id?: string } | null)
          : null;

        const serviceName = serviceResult.status === "fulfilled"
          ? (serviceResult.value.data as { name?: string } | null)?.name ?? "Service"
          : "Service";

        if (!providerData?.profile_id) return;

        const profileResult = await db.from("profiles").select("email").eq("id", providerData.profile_id).single();
        const providerEmail = (profileResult.data as { email?: string } | null)?.email ?? null;

        if (providerEmail) {
          await sendProviderCancellationAlert(providerEmail, {
            appointmentId: appt.id,
            businessName: providerData.business_name ?? "",
            serviceName,
            startTime: appt.start_time,
            address: providerData.address && providerData.city
              ? `${providerData.address}, ${providerData.city}`
              : providerData.address ?? null,
            customerName: null, // account is being deleted
          });
        }
      })
    );
  }

  // 2. Delete the auth user via admin client (this cascades to profile,
  //    which SET-NULL-cascades to appointments and reviews)
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const adminClient = createAdminClient();

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("[deleteAccount] Failed to delete user:", deleteError);
    return { error: "deleteFailed" };
  }

  return { success: true };
}
