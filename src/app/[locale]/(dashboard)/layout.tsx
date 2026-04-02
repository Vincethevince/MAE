import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider } from "@/lib/supabase/queries";
import { DashboardSidebar } from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { locale } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileData } = await (supabase as any)
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string; full_name: string | null } | null;

  if (!profile || profile.role !== "provider") {
    redirect(`/${locale}`);
  }

  const provider = await getCurrentProvider(supabase);
  const t = await getTranslations("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        locale={locale}
        businessName={provider?.business_name ?? profile.full_name ?? ""}
        navLabels={{
          dashboard: t("nav.dashboard"),
          calendar: t("nav.calendar"),
          services: t("nav.services"),
          employees: t("nav.employees"),
          availability: t("nav.availability"),
          settings: t("nav.settings"),
        }}
      />
      <main className="flex-1 lg:ml-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
