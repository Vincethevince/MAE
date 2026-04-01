import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider } from "@/lib/supabase/queries";

interface CalendarPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CalendarPage({ params }: CalendarPageProps) {
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

  const t = await getTranslations("dashboard");

  return (
    <div>
      <h1 className="text-2xl font-bold">{t("nav.calendar")}</h1>
      <p className="text-muted-foreground mt-1">{provider.business_name}</p>
    </div>
  );
}
