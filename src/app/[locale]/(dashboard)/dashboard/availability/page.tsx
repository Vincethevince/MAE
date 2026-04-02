import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider, getProviderAvailability } from "@/lib/supabase/queries";
import { AvailabilityForm } from "./AvailabilityForm";

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

  const t = await getTranslations("dashboard.availability");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <AvailabilityForm availability={availability} />
    </div>
  );
}
