"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
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
