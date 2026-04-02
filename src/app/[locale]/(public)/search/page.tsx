import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { searchProviders } from "@/lib/supabase/queries";
import { SearchForm } from "@/components/features/SearchForm";
import { ProviderCard } from "@/components/features/ProviderCard";

interface SearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ query?: string; city?: string; category?: string }>;
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params;
  const { query, city, category } = await searchParams;

  const supabase = await createClient();
  const providers = await searchProviders(supabase, {
    query,
    city,
    category,
  });

  const t = await getTranslations("search");
  const tBy = await getTranslations("search.byTimeSearch");

  const hasFilters = Boolean(query || city || category);

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
        <p className="mb-4 text-sm text-muted-foreground">{resultsLabel}</p>
      )}

      {providers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} locale={locale} />
          ))}
        </div>
      ) : hasFilters ? (
        <div className="py-16 text-center">
          <p className="text-lg font-medium text-foreground">{t("emptyState")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("emptyStateHint")}</p>
        </div>
      ) : null}
    </div>
  );
}
