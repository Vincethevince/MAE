import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCustomerStats } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ExportDataForm } from "./ExportDataForm";
import { deleteAccount } from "./actions";

interface ProfilePageProps {
  params: Promise<{ locale: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
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
    .select("full_name, email, phone, created_at")
    .eq("id", user.id)
    .single();

  const profile = profileData as {
    full_name: string | null;
    email: string;
    phone: string | null;
    created_at: string;
  } | null;

  const [t, stats] = await Promise.all([
    getTranslations("profile"),
    profile ? getCustomerStats(supabase, user.id, profile.created_at) : null,
  ]);

  async function handleDeleteAccount(formData: FormData): Promise<void> {
    "use server";
    const result = await deleteAccount(formData);
    if (!("error" in result)) {
      const rawLocale = formData.get("locale")?.toString() ?? "de";
      const safeLocale = ["de", "en"].includes(rawLocale) ? rawLocale : "de";
      redirect(`/${safeLocale}`);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("emailLabel")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{profile?.email ?? user.email}</p>
        </CardContent>
      </Card>

      {/* Customer stats */}
      {stats && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("stats.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.totalAppointments === 0 ? (
                <p className="text-sm text-muted-foreground">{t("stats.noBookingsYet")}</p>
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted-foreground">{t("stats.totalAppointments")}</dt>
                    <dd className="mt-0.5 text-lg font-semibold">{stats.totalAppointments}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("stats.completedAppointments")}</dt>
                    <dd className="mt-0.5 text-lg font-semibold">{stats.completedAppointments}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("stats.totalSpent")}</dt>
                    <dd className="mt-0.5 text-lg font-semibold">
                      {new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
                        style: "currency",
                        currency: "EUR",
                      }).format(stats.totalSpentCents / 100)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("stats.memberSince")}</dt>
                    <dd className="mt-0.5 font-medium">
                      {new Date(stats.memberSince).toLocaleDateString(
                        locale === "de" ? "de-DE" : "en-GB",
                        { year: "numeric", month: "long" }
                      )}
                    </dd>
                  </div>
                  {stats.favoriteProviderName && (
                    <div className="col-span-2 sm:col-span-2">
                      <dt className="text-muted-foreground">{t("stats.favoriteProvider")}</dt>
                      <dd className="mt-0.5 font-medium">{stats.favoriteProviderName}</dd>
                    </div>
                  )}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <ProfileForm
          fullName={profile?.full_name ?? ""}
          phone={profile?.phone ?? null}
          locale={locale}
        />
      </div>

      <div className="mt-6">
        <ChangePasswordForm />
      </div>

      <div className="mt-6">
        <div className="rounded-lg border border-border p-6">
          <h2 className="mb-2 text-base font-semibold">
            {t("exportData.title")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("exportData.description")}
          </p>
          <ExportDataForm />
        </div>
      </div>

      <div className="mt-10">
        <div className="rounded-lg border border-destructive/50 p-6">
          <h2 className="mb-2 text-base font-semibold text-destructive">
            {t("deleteAccountTitle")}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("deleteAccountDescription")}
          </p>
          <form action={handleDeleteAccount} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <div className="space-y-1">
              <label
                htmlFor="delete-password"
                className="text-sm font-medium"
              >
                {t("deleteAccountPasswordLabel")}
              </label>
              <input
                id="delete-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="delete-confirmation"
                className="text-sm font-medium"
              >
                {t("deleteAccountConfirmLabel")}
              </label>
              <input
                id="delete-confirmation"
                name="confirmation"
                type="text"
                autoComplete="off"
                placeholder={t("deleteAccountConfirmPlaceholder")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t("deleteAccountButton")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
