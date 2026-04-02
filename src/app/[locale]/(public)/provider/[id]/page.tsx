import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getProviderById, getProviderReviews } from "@/lib/supabase/queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "@/components/features/RatingStars";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProviderDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
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

function formatTime(time: string): string {
  // time is stored as HH:MM:SS or HH:MM
  return time.slice(0, 5);
}

export default async function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const { locale, id } = await params;

  if (!UUID_REGEX.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const [provider, reviews] = await Promise.all([
    getProviderById(supabase, id),
    getProviderReviews(supabase, id),
  ]);

  if (!provider) {
    notFound();
  }

  const t = await getTranslations("provider");
  const tSearch = await getTranslations("search");

  // Group availability by day
  const availabilityByDay = new Map<number, { start: string; end: string }[]>();
  for (const slot of provider.availability) {
    const existing = availabilityByDay.get(slot.day_of_week) ?? [];
    existing.push({ start: slot.start_time, end: slot.end_time });
    availabilityByDay.set(slot.day_of_week, existing);
  }

  const weekDays = [1, 2, 3, 4, 5, 6, 0] as const;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Provider header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{provider.business_name}</h1>
              <Badge variant="secondary">{provider.category}</Badge>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <RatingStars rating={provider.rating} size="md" />
              <span className="font-medium">{formatRating(provider.rating)}</span>
              <span className="text-muted-foreground text-sm">
                (
                {provider.review_count === 1
                  ? tSearch("reviewCount", { count: provider.review_count })
                  : tSearch("reviewCountPlural", { count: provider.review_count })}
                )
              </span>
            </div>
          </div>
        </div>

        {provider.description && (
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {provider.description}
          </p>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-4 text-sm">
          <div>
            <span className="font-medium">{t("address")}: </span>
            <span className="text-muted-foreground">
              {provider.address}, {provider.postal_code} {provider.city}
            </span>
          </div>
          {provider.phone && (
            <div>
              <span className="font-medium">{t("phone")}: </span>
              <a
                href={`tel:${provider.phone}`}
                className="text-primary hover:underline"
              >
                {provider.phone}
              </a>
            </div>
          )}
          {provider.website && (
            <div>
              <span className="font-medium">{t("website")}: </span>
              <a
                href={provider.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {provider.website}
              </a>
            </div>
          )}
        </div>
      </div>

      <Separator className="mb-8" />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Services */}
          <section>
            <h2 className="text-xl font-semibold mb-4">{t("servicesTitle")}</h2>
            {provider.services.length === 0 ? (
              <p className="text-muted-foreground">{t("noServices")}</p>
            ) : (
              <div className="space-y-3">
                {provider.services.map((service) => (
                  <Card key={service.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {service.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("duration", { minutes: service.duration_minutes })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="font-semibold">
                            {formatPrice(service.price_cents)}
                          </span>
                          <a
                            href={`/${locale}/book/${provider.id}?service=${service.id}`}
                            className={buttonVariants({ size: "sm" })}
                          >
                            {t("bookButton")}
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Reviews */}
          <section>
            <h2 className="text-xl font-semibold mb-4">{t("reviewsTitle")}</h2>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground">{t("noReviews")}</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <RatingStars rating={review.rating} size="sm" />
                        <span className="text-sm font-medium">
                          {review.user_full_name ?? "Anonym"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(review.created_at).toLocaleDateString("de-DE")}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Availability sidebar */}
        <aside>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("scheduleTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {availabilityByDay.size === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noSchedule")}</p>
              ) : (
                <ul className="space-y-2">
                  {weekDays.map((day) => {
                    const slots = availabilityByDay.get(day);
                    return (
                      <li key={day} className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">
                          {t(`days.${day}`)}
                        </span>
                        {slots ? (
                          <span className="text-muted-foreground">
                            {slots
                              .map((s) => `${formatTime(s.start)}–${formatTime(s.end)}`)
                              .join(", ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
