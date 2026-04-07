"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_LOCALES = ["de", "en"] as const;
type Locale = typeof VALID_LOCALES[number];

function sanitizeLocale(raw: unknown): Locale {
  if (typeof raw === "string" && VALID_LOCALES.includes(raw as Locale)) {
    return raw as Locale;
  }
  return "de";
}

export async function toggleSaveProvider(formData: FormData): Promise<void> {
  const providerId = formData.get("providerId");
  const locale = sanitizeLocale(formData.get("locale"));

  if (typeof providerId !== "string" || !UUID_RE.test(providerId)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Check if already saved
  const { data: existing } = await db
    .from("saved_providers")
    .select("id")
    .eq("customer_id", user.id)
    .eq("provider_id", providerId)
    .maybeSingle();

  if (existing) {
    await db
      .from("saved_providers")
      .delete()
      .eq("customer_id", user.id)
      .eq("provider_id", providerId);
  } else {
    await db.from("saved_providers").insert({
      customer_id: user.id,
      provider_id: providerId,
    });
  }

  revalidatePath(`/${locale}/provider/${providerId}`);
  revalidatePath(`/${locale}/saved`);
  revalidatePath(`/${locale}/search`);
}
