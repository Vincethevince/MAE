import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://makeappointmentseasier.com";

// Use a direct Supabase client (no cookies needed for public data)
function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient<Database>(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}/de`,
      alternates: { languages: { de: `${APP_URL}/de`, en: `${APP_URL}/en` } },
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${APP_URL}/de/search`,
      alternates: { languages: { de: `${APP_URL}/de/search`, en: `${APP_URL}/en/search` } },
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${APP_URL}/de/search/by-time`,
      alternates: { languages: { de: `${APP_URL}/de/search/by-time`, en: `${APP_URL}/en/search/by-time` } },
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${APP_URL}/de/impressum`,
      changeFrequency: "monthly",
      priority: 0.2,
    },
    {
      url: `${APP_URL}/de/datenschutz`,
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];

  // Fetch all active provider profiles for dynamic routes
  const supabase = createPublicClient();
  if (!supabase) return staticRoutes;

  const { data: rawProviders } = await supabase
    .from("providers")
    .select("id, updated_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1000); // Cap at 1000 for sitemap performance

  const providers = rawProviders as Array<{ id: string; updated_at: string }> | null;

  const providerRoutes: MetadataRoute.Sitemap =
    (providers ?? []).map((p) => ({
      url: `${APP_URL}/de/provider/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...providerRoutes];
}
