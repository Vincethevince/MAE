import Link from "next/link";
import { useTranslations } from "next-intl";
import { Navigation } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/features/RatingStars";
import { SaveProviderButton } from "@/components/features/SaveProviderButton";
import type { ProviderSearchResult } from "@/lib/supabase/queries";
import { getProviderBadges } from "@/lib/provider-badges";

interface ProviderCardProps {
  provider: ProviderSearchResult;
  locale: string;
  isSaved?: boolean;
  showSaveButton?: boolean;
  nextAvailableSlot?: string | null;
  distanceKm?: number;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function formatRating(rating: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(rating);
}

export function ProviderCard({
  provider,
  locale,
  isSaved,
  showSaveButton,
  nextAvailableSlot,
  distanceKm,
}: ProviderCardProps) {
  const t = useTranslations("search");

  const reviewLabel =
    provider.review_count === 1
      ? t("reviewCount", { count: provider.review_count })
      : t("reviewCountPlural", { count: provider.review_count });

  const badges = getProviderBadges(provider);

  return (
    <Link href={`/${locale}/provider/${provider.slug ?? provider.id}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
              {provider.business_name}
            </h3>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="secondary" className="text-xs">
                {provider.category}
              </Badge>
              {showSaveButton && isSaved !== undefined && locale && (
                <SaveProviderButton
                  providerId={provider.id}
                  initialSaved={isSaved}
                  locale={locale}
                  saveLabel={t("saveProvider")}
                  unsaveLabel={t("unsaveProvider")}
                />
              )}
            </div>
          </div>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {badges.includes("topRated") && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  {t("badges.topRated")}
                </Badge>
              )}
              {badges.includes("popular") && (
                <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                  {t("badges.popular")}
                </Badge>
              )}
              {badges.includes("new") && (
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">
                  {t("badges.new")}
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <p className="text-sm text-muted-foreground">{provider.city}</p>
            {distanceKm !== undefined && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Navigation className="h-3 w-3 shrink-0" />
                {t("kmAway", { distance: distanceKm.toFixed(1) })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <RatingStars rating={provider.rating} size="sm" />
            <span className="text-sm font-medium">
              {formatRating(provider.rating)}
            </span>
            <span className="text-sm text-muted-foreground">
              ({reviewLabel})
            </span>
          </div>

          {provider.min_price_cents !== null && (
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">
                {t("from")} {formatPrice(provider.min_price_cents)}
              </span>
            </p>
          )}

          {nextAvailableSlot && (
            <p className="text-sm mt-2">
              <span className="text-muted-foreground">{t("nextAvailable")}: </span>
              <span className="font-medium text-green-600 dark:text-green-400">{nextAvailableSlot}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
