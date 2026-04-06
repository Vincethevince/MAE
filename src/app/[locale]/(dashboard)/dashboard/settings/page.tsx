import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider } from "@/lib/supabase/queries";
import { SettingsForm } from "./SettingsForm";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
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

  const t = await getTranslations("dashboard.settings");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{provider.business_name}</p>
      </div>

      <SettingsForm
        provider={{
          businessName: provider.business_name,
          address: provider.address,
          city: provider.city,
          postalCode: provider.postal_code,
          phone: provider.phone,
          category: provider.category,
          description: provider.description,
          website: provider.website,
        }}
      />
    </div>
  );
}
