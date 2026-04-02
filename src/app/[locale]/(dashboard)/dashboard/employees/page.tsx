import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProvider,
  getProviderEmployees,
  getEmployeeAvailability,
} from "@/lib/supabase/queries";
import type { Database } from "@/types/database";
import { EmployeesClient } from "./EmployeesClient";

type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"];

export interface EmployeeWithAvailability extends EmployeeRow {
  availability: AvailabilityRow[];
}

interface EmployeesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function EmployeesPage({ params }: EmployeesPageProps) {
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
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("dashboard.employees");

  const employees = await getProviderEmployees(supabase, provider.id);

  const employeesWithAvailability: EmployeeWithAvailability[] =
    await Promise.all(
      employees.map(async (emp) => {
        const availability = await getEmployeeAvailability(supabase, emp.id);
        return { ...emp, availability };
      })
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <EmployeesClient employees={employeesWithAvailability} />
    </div>
  );
}
