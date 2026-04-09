import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Search, Calendar, Zap } from "lucide-react";

import { SearchForm } from "@/components/features/SearchForm";
import { ByTimeSearchForm } from "@/components/features/ByTimeSearchForm";
import { ProviderCard } from "@/components/features/ProviderCard";
import { PROVIDER_CATEGORIES } from "@/lib/validations/provider";
import { createClient } from "@/lib/supabase/server";
import type { ProviderSearchResult } from "@/lib/supabase/queries";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const CATEGORY_ICONS: Record<string, string> = {
  friseur: "✂️",
  kosmetik: "💄",
  nagelstudio: "💅",
  massage: "🤲",
  physiotherapie: "🏃",
  tattoostudio: "🖋️",
  barbershop: "💈",
  waxing: "✨",
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations("home.hero");
  const tCat = await getTranslations("home.categories");
  const tFeatured = await getTranslations("home.featured");
  const tHow = await getTranslations("home.howItWorks");
  const tSearch = await getTranslations("search");
  const tBy = await getTranslations("search.byTimeSearch");

  // Fetch top-rated providers (at least 1 review)
  const supabase = await createClient();
  const { data: featuredRaw } = await supabase
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .gt("review_count", 0)
    .order("rating", { ascending: false })
    .limit(6);

  // Map to ProviderSearchResult shape; skip min_price lookup for simplicity
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const featuredProviders: ProviderSearchResult[] = (featuredRaw ?? []).map(
    (p) => ({ ...(p as any), min_price_cents: null as number | null })
  );

  return (
    <main className="flex flex-col">
      {/* Hero section */}
      <section className="flex flex-col items-center justify-center bg-muted/30 px-4 py-20">
        <div className="max-w-3xl w-full text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600">{t("subtitle")}</p>
        </div>

        <div className="w-full max-w-3xl">
          <SearchForm locale={locale} />
        </div>
      </section>

      {/* Find by availability section */}
      <section className="flex flex-col items-center justify-center border-t bg-background px-4 py-16">
        <div className="max-w-3xl w-full">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold">{tBy("title")}</h2>
            <p className="mt-2 text-muted-foreground">{tBy("subtitle")}</p>
          </div>
          <ByTimeSearchForm locale={locale} />
        </div>
      </section>

      {/* Categories section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">{tCat("title")}</h2>
            <p className="mt-2 text-muted-foreground">{tCat("subtitle")}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PROVIDER_CATEGORIES.map((slug) => (
              <Link
                key={slug}
                href={`/${locale}/search?category=${slug}`}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-6 text-center transition-shadow hover:shadow-md hover:border-primary"
              >
                <span className="text-3xl" aria-hidden="true">
                  {CATEGORY_ICONS[slug]}
                </span>
                <span className="text-sm font-medium">
                  {tSearch(`categories.${slug}`)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured providers section — only shown if there are rated providers */}
      {featuredProviders.length > 0 && (
        <section className="border-t bg-muted/20 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between mb-10">
              <div>
                <h2 className="text-2xl font-bold">{tFeatured("title")}</h2>
                <p className="mt-2 text-muted-foreground">
                  {tFeatured("subtitle")}
                </p>
              </div>
              <Link
                href={`/${locale}/search?sort=rating`}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                {tFeatured("seeAll")} →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  locale={locale}
                  showSaveButton={false}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works section */}
      <section className="border-t px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold">{tHow("title")}</h2>
            <p className="mt-2 text-muted-foreground">{tHow("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  01
                </p>
                <h3 className="font-semibold text-base mb-2">
                  {tHow("step1Title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tHow("step1Body")}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  02
                </p>
                <h3 className="font-semibold text-base mb-2">
                  {tHow("step2Title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tHow("step2Body")}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                  03
                </p>
                <h3 className="font-semibold text-base mb-2">
                  {tHow("step3Title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tHow("step3Body")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
