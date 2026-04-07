import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getSavedProviders } from "@/lib/supabase/queries";
import { ProviderCard } from "@/components/features/ProviderCard";

interface SavedPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SavedPage({ params }: SavedPageProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [savedProviders, t] = await Promise.all([
    getSavedProviders(supabase, user.id),
    getTranslations("saved"),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      {savedProviders.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              locale={locale}
              isSaved={true}
              showSaveButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
