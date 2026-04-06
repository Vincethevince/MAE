import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider, getProviderAvailability, getProviderBlocksForDateRange } from "@/lib/supabase/queries";
import { AvailabilityForm } from "./AvailabilityForm";
import { BlocksSection } from "./BlocksSection";

interface AvailabilityPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AvailabilityPage({ params }: AvailabilityPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const provider = await getCurrentProvider(supabase);

  if (!provider) {
    redirect(`/${locale}/dashboard/onboarding`);
  }

  const availability = await getProviderAvailability(supabase, provider.id);

  // Fetch blocks for the next 90 days
  const now = new Date();
  const ninetyDaysLater = new Date(now);
  ninetyDaysLater.setDate(now.getDate() + 90);
  const blocks = await getProviderBlocksForDateRange(supabase, provider.id, now, ninetyDaysLater);

  const t = await getTranslations("dashboard.availability");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <AvailabilityForm availability={availability} />

      <BlocksSection
        blocks={blocks}
        locale={locale}
        labels={{
          title: t("blocks.title"),
          description: t("blocks.description"),
          startDate: t("blocks.startDate"),
          startTime: t("blocks.startTime"),
          endDate: t("blocks.endDate"),
          endTime: t("blocks.endTime"),
          labelField: t("blocks.labelField"),
          addButton: t("blocks.addButton"),
          removeButton: t("blocks.removeButton"),
          noBlocks: t("blocks.noBlocks"),
          validationError: t("blocks.errors.validationError"),
          saveFailed: t("blocks.errors.saveFailed"),
        }}
      />
    </div>
  );
}
