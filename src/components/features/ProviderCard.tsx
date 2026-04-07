import Link from "next/link";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/features/RatingStars";
import { SaveProviderButton } from "@/components/features/SaveProviderButton";
import type { ProviderSearchResult } from "@/lib/supabase/queries";

interface ProviderCardProps {
  provider: ProviderSearchResult;
  locale: string;
  isSaved?: boolean;
  showSaveButton?: boolean;
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
}: ProviderCardProps) {
  const t = useTranslations("search");

  const reviewLabel =
    provider.review_count === 1
      ? t("reviewCount", { count: provider.review_count })
      : t("reviewCountPlural", { count: provider.review_count });

  return (
    <Link href={`/${locale}/provider/${provider.id}`} className="block group">
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

          <p className="text-sm text-muted-foreground mb-3">{provider.city}</p>

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
        </CardContent>
      </Card>
    </Link>
  );
}
