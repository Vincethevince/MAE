import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Toaster } from "sonner";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider } from "@/lib/supabase/queries";
import { DashboardSidebar } from "./DashboardSidebar";
import { NewBookingNotifier } from "@/components/features/NewBookingNotifier";
import { sendProviderWelcome } from "@/lib/email";

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

  // Fetch pending appointment count for the sidebar badge
  let pendingCount = 0;
  if (provider) {
    const { count } = await (supabase as any)
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("provider_id", provider.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  // Fire-and-forget: send welcome email on first dashboard visit
  if (provider && provider.welcome_email_sent_at === null) {
    void (async () => {
      try {
        // Mark first — prevents duplicate sends if the layout renders twice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("providers")
          .update({ welcome_email_sent_at: new Date().toISOString() })
          .eq("id", provider.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profileRow } = await (supabase as any)
          .from("profiles")
          .select("email")
          .eq("id", provider.profile_id)
          .single();

        const providerEmail = (profileRow as { email: string } | null)?.email;
        if (providerEmail) {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/de/dashboard`;
          await sendProviderWelcome(providerEmail, {
            businessName: provider.business_name,
            dashboardUrl,
          });
        }
      } catch (err) {
        console.error("[welcome-email] Failed to send provider welcome email:", err);
      }
    })();
  }

  const t = await getTranslations("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      {provider && (
        <NewBookingNotifier
          providerId={provider.id}
          messages={{
            newBooking: t("notifications.newBooking"),
            newBookingBody: t("notifications.newBookingBody"),
          }}
        />
      )}
      <DashboardSidebar
        locale={locale}
        businessName={provider?.business_name ?? profile.full_name ?? ""}
        pendingCount={pendingCount}
        navLabels={{
          dashboard: t("nav.dashboard"),
          calendar: t("nav.calendar"),
          customers: t("nav.customers"),
          services: t("nav.services"),
          employees: t("nav.employees"),
          reviews: t("nav.reviews"),
          analytics: t("nav.analytics"),
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
