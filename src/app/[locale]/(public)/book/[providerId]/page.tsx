import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getProviderById } from "@/lib/supabase/queries";
import { buttonVariants } from "@/lib/button-variants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ServiceSelectionPageProps {
  params: Promise<{ locale: string; providerId: string }>;
}

export async function generateMetadata({
  params,
}: ServiceSelectionPageProps): Promise<Metadata> {
  const { providerId, locale } = await params;
  if (!UUID_REGEX.test(providerId)) return {};

  const supabase = await createClient();
  const provider = await getProviderById(supabase, providerId);
  if (!provider) return {};

  const title =
    locale === "de"
      ? `Dienstleistung wählen – ${provider.business_name}`
      : `Choose a service – ${provider.business_name}`;

  return { title };
}

function formatPrice(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default async function ServiceSelectionPage({
  params,
}: ServiceSelectionPageProps) {
  const { locale, providerId } = await params;

  if (!UUID_REGEX.test(providerId)) {
    notFound();
  }

  const supabase = await createClient();
  const provider = await getProviderById(supabase, providerId);

  if (!provider) {
    notFound();
  }

  const activeServices = provider.services.filter((s) => s.is_active !== false);

  if (activeServices.length === 0) {
    notFound();
  }

  // If there's exactly one service, redirect straight to the booking page
  if (activeServices.length === 1) {
    redirect(`/${locale}/book/${providerId}/${activeServices[0]!.id}`);
  }

  const t = await getTranslations("booking");
  const tProvider = await getTranslations("provider");

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("selectService")}</h1>
        <p className="text-muted-foreground mt-1">{provider.business_name}</p>
      </div>

      <div className="space-y-3">
        {activeServices.map((service) => (
          <Card key={service.id} className="hover:bg-muted/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{service.name}</p>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs font-normal">
                      {tProvider("duration", { minutes: service.duration_minutes })}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {formatPrice(service.price_cents, locale)}
                    </span>
                  </div>
                </div>
                <a
                  href={`/${locale}/book/${providerId}/${service.id}`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {t("selectService")}
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
