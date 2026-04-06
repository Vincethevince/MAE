"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider } from "@/lib/supabase/queries";
import { z } from "zod";

const VALID_LOCALES = ["de", "en"] as const;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const addBlockSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  label: z.string().max(100).optional(),
});

export type BlockActionResult = { error?: string };

export async function addProviderBlock(formData: FormData): Promise<BlockActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const provider = await getCurrentProvider(supabase);
  if (!provider) return { error: "providerNotFound" };

  const raw = {
    startDate: formData.get("startDate")?.toString() ?? "",
    startTime: formData.get("startTime")?.toString() ?? "",
    endDate: formData.get("endDate")?.toString() ?? "",
    endTime: formData.get("endTime")?.toString() ?? "",
    label: formData.get("label")?.toString() ?? "",
  };

  const parsed = addBlockSchema.safeParse(raw);
  if (!parsed.success) return { error: "validationError" };

  const { startDate, startTime, endDate, endTime, label } = parsed.data;
  // Append Z to explicitly treat form inputs as UTC, consistent with how
  // appointments are stored (timestamptz). Supabase session TZ is UTC by default,
  // but being explicit prevents silent breakage if the session TZ ever changes.
  const startIso = `${startDate}T${startTime}:00Z`;
  const endIso = `${endDate}T${endTime}:00Z`;

  if (new Date(endIso) <= new Date(startIso)) {
    return { error: "validationError" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("provider_blocks").insert({
    provider_id: provider.id,
    start_time: startIso,
    end_time: endIso,
    label: label || null,
  });

  if (error) return { error: "saveFailed" };

  const locale = formData.get("locale")?.toString() ?? "de";
  const safeLocale = VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number]) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/availability`);
  return {};
}

export async function removeProviderBlock(formData: FormData): Promise<BlockActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };

  const provider = await getCurrentProvider(supabase);
  if (!provider) return { error: "providerNotFound" };

  const blockId = formData.get("blockId")?.toString() ?? "";
  if (!blockId || !UUID_REGEX.test(blockId)) return { error: "notFound" };

  // RLS ensures only own blocks can be deleted
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("provider_blocks")
    .delete()
    .eq("id", blockId)
    .eq("provider_id", provider.id);

  if (error) return { error: "saveFailed" };

  const locale = formData.get("locale")?.toString() ?? "de";
  const safeLocale = VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number]) ? locale : "de";
  revalidatePath(`/${safeLocale}/dashboard/availability`);
  return {};
}
