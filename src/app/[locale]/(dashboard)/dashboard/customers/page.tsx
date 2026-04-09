import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProvider,
  getProviderCustomers,
} from "@/lib/supabase/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CustomersPageProps {
  params: Promise<{ locale: string }>;
}

export default async function CustomersPage({ params }: CustomersPageProps) {
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

  const [customers, t] = await Promise.all([
    getProviderCustomers(supabase, provider.id),
    getTranslations("dashboard.customers"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("title")} ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noCustomers")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">{t("nameColumn")}</th>
                    <th className="pb-2 font-medium">{t("emailColumn")}</th>
                    <th className="pb-2 font-medium text-right">
                      {t("appointmentsColumn")}
                    </th>
                    <th className="pb-2 font-medium">{t("lastAppointmentColumn")}</th>
                    <th className="pb-2 font-medium">{t("lastServiceColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.userId}
                      className="border-b last:border-0"
                    >
                      <td className="py-2 font-medium">
                        {customer.fullName ?? (
                          <span className="text-muted-foreground italic">
                            {t("anonymous")}
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {customer.email}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {customer.appointmentCount}
                      </td>
                      <td className="py-2 text-muted-foreground tabular-nums">
                        {new Intl.DateTimeFormat(
                          locale === "de" ? "de-DE" : "en-GB",
                          { dateStyle: "medium" }
                        ).format(new Date(customer.lastAppointmentDate))}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {customer.lastServiceName ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
