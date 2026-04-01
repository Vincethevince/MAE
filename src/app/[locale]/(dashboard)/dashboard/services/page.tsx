import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentProvider,
  getProviderServices,
} from "@/lib/supabase/queries";
import { ServicesClient } from "./ServicesClient";

interface ServicesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ServicesPage({ params }: ServicesPageProps) {
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

  const services = await getProviderServices(supabase, provider.id);

  return <ServicesClient services={services} />;
}
