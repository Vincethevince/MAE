import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { searchProvidersByTimeSlot } from "@/lib/supabase/queries";
import { ByTimeSearchForm } from "@/components/features/ByTimeSearchForm";
import { ProviderCard } from "@/components/features/ProviderCard";

interface ByTimeSearchPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    date?: string;
    startTime?: string;
    endTime?: string;
    city?: string;
    category?: string;
  }>;
}

/** Validate a YYYY-MM-DD date string and return true if it is today or later. */
function isValidFutureDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed >= today;
}

/** Validate HH:MM time string (hours 00-23, minutes 00-59). */
function isValidTime(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr);
}

export default async function ByTimeSearchPage({
  params,
  searchParams,
}: ByTimeSearchPageProps) {
  const { locale } = await params;
  const { date, startTime, endTime, city, category } = await searchParams;

  const t = await getTranslations("search");
  const tBy = await getTranslations("search.byTimeSearch");

  const hasParams = Boolean(date && startTime && endTime);

  // Validate inputs before running the query
  const isValid =
    hasParams &&
    isValidFutureDate(date!) &&
    isValidTime(startTime!) &&
    isValidTime(endTime!) &&
    endTime! > startTime!;

  let providers: Awaited<ReturnType<typeof searchProvidersByTimeSlot>> = [];

  if (isValid) {
    const supabase = await createClient();
    providers = await searchProvidersByTimeSlot(supabase, {
      date: new Date(date!),
      startTime: startTime!,
      endTime: endTime!,
      city,
      category,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{tBy("title")}</h1>
        <p className="mt-1 text-muted-foreground">{tBy("subtitle")}</p>
      </div>

      {/* Search form */}
      <div className="mb-8">
        <ByTimeSearchForm
          locale={locale}
          initialDate={date}
          initialStartTime={startTime}
          initialEndTime={endTime}
          initialCity={city}
          initialCategory={category}
        />
      </div>

      {/* Results */}
      {isValid && (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {providers.length === 1
              ? t("resultsCount", { count: providers.length })
              : t("resultsCountPlural", { count: providers.length })}
          </p>

          {providers.length > 0 ? (
            <>
              <p className="mb-4 text-base font-semibold">{tBy("resultsTitle")}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {providers.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} locale={locale} />
                ))}
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              <p className="text-lg font-medium text-foreground">{tBy("noResults")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tBy("noResultsHint")}</p>
            </div>
          )}
        </>
      )}

      {/* Link back to regular search */}
      <div className="mt-10 border-t pt-6">
        <Link
          href={`/${locale}/search`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {t("searchButton")}
        </Link>
      </div>
    </div>
  );
}
