import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider, getProviderReviews } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RatingStars } from "@/components/features/RatingStars";

interface ReviewsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ReviewsPage({ params }: ReviewsPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  const provider = await getCurrentProvider(supabase);

  if (!provider) {
    redirect(`/${locale}/dashboard`);
  }

  const reviews = await getProviderReviews(supabase, provider.id);
  const t = await getTranslations("dashboard.reviews");

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => r.rating === star).length;
    const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
    return { star, count, percentage };
  });

  const formattedAverage = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(average);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      {reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("averageRating")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start gap-8">
              <div className="text-center shrink-0">
                <p className="text-4xl font-bold">{formattedAverage}</p>
                <div className="mt-1">
                  <RatingStars rating={average} size="md" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("totalReviews", { count: reviews.length })}
                </p>
              </div>

              <div className="flex-1 w-full space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {t("starDistribution")}
                </p>
                {distribution.map(({ star, count, percentage }) => (
                  <div key={star} className="flex items-center gap-3 text-sm">
                    <span className="w-12 text-muted-foreground whitespace-nowrap shrink-0">
                      {star} ★
                    </span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {reviews.length === 0 ? (
        <p className="text-muted-foreground">{t("noReviews")}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <RatingStars rating={r.rating} size="sm" />
                    <span className="text-sm font-medium">
                      {r.user_full_name ?? t("anonymous")}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString(
                      locale === "de" ? "de-DE" : "en-GB"
                    )}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
