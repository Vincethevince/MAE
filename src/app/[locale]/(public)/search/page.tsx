import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { searchProviders } from "@/lib/supabase/queries";
import { SearchForm } from "@/components/features/SearchForm";
import { ProviderCard } from "@/components/features/ProviderCard";

const VALID_SORTS = ["rating", "name"] as const;
type SortOption = typeof VALID_SORTS[number];

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    query?: string;
    city?: string;
    category?: string;
    sort?: string;
    minRating?: string;
  }>;
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const { query, city, category } = await searchParams;
  const t = await getTranslations({ locale, namespace: "search" });
  const parts = [query, city, category].filter(Boolean);
  const title = parts.length > 0
    ? `${parts.join(", ")} – MAE`
    : `${t("searchLabel")} – MAE`;
  return { title };
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const { query, city, category, sort: rawSort, minRating: rawMinRating } = await searchParams;

  // Validate sort param
  const sort: SortOption = VALID_SORTS.includes(rawSort as SortOption)
    ? (rawSort as SortOption)
    : "rating";

  // Validate minRating param (1-5, integer only)
  const minRatingNum = rawMinRating ? parseInt(rawMinRating, 10) : 0;
  const minRating = minRatingNum >= 1 && minRatingNum <= 5 ? minRatingNum : 0;

  const supabase = await createClient();
  const providers = await searchProviders(supabase, {
    query,
    city,
    category,
    sort,
    minRating,
  });

  const t = await getTranslations("search");
  const tBy = await getTranslations("search.byTimeSearch");

  const hasFilters = Boolean(query || city || category || minRating);

  const resultsLabel =
    providers.length === 1
      ? t("resultsCount", { count: providers.length })
      : t("resultsCountPlural", { count: providers.length });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4">
        <SearchForm
          locale={locale}
          initialQuery={query}
          initialCity={city}
          initialCategory={category}
        />
      </div>

      <div className="mb-8">
        <Link
          href={`/${locale}/search/by-time`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {tBy("title")} →
        </Link>
      </div>

      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{resultsLabel}</p>
          {/* Sort and filter controls — single form to keep URL params consistent */}
          <form method="get" action={`/${locale}/search`} className="flex flex-wrap items-center gap-2 text-sm">
            {query && <input type="hidden" name="query" value={query} />}
            {city && <input type="hidden" name="city" value={city} />}
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="sort-order" className="text-muted-foreground whitespace-nowrap sr-only">
              {t("sortLabel")}
            </label>
            <select
              id="sort-order"
              name="sort"
              defaultValue={sort}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="rating">{t("sortByRating")}</option>
              <option value="name">{t("sortByName")}</option>
            </select>
            <label htmlFor="min-rating" className="text-muted-foreground whitespace-nowrap sr-only">
              {t("minRatingLabel")}
            </label>
            <select
              id="min-rating"
              name="minRating"
              defaultValue={minRating || ""}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">{t("minRatingAll")}</option>
              <option value="4">4+ ★</option>
              <option value="3">3+ ★</option>
            </select>
            <button
              type="submit"
              className="h-8 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent transition-colors"
            >
              {t("applyFilters")}
            </button>
          </form>
        </div>
      )}

      {providers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-foreground">
            {hasFilters ? t("emptyState") : t("emptyStateNoFilters")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasFilters ? t("emptyStateHint") : t("emptyStateCta")}
          </p>
        </div>
      )}
    </div>
  );
}
