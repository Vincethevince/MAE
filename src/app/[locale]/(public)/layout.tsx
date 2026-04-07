import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProvider } from "@/lib/supabase/queries";
import { buttonVariants } from "@/components/ui/button";
import { LogoutButton } from "@/components/features/LogoutButton";
import { Separator } from "@/components/ui/separator";

interface PublicLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProvider = user ? !!(await getCurrentProvider(supabase)) : false;

  const t = await getTranslations("common");
  const tAppointments = await getTranslations("appointments");
  const tProfile = await getTranslations("profile");
  const tLegal = await getTranslations("legal");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link
            href={`/${locale}`}
            className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
          >
            {t("appName")}
          </Link>

          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href={`/${locale}/appointments`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {tAppointments("myAppointments")}
                </Link>
                <Link
                  href={`/${locale}/profile`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {tProfile("navLabel")}
                </Link>
                {isProvider && (
                  <Link
                    href={`/${locale}/dashboard`}
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    Dashboard
                  </Link>
                )}
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href={`/${locale}/login`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {t("login")}
                </Link>
                <Link
                  href={`/${locale}/register`}
                  className={buttonVariants({ size: "sm" })}
                >
                  {t("register")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} {t("appName")} – {t("tagline")}</span>
          <nav className="flex items-center gap-1">
            <Link
              href={`/${locale}/impressum`}
              className="hover:text-foreground transition-colors px-2 py-1"
            >
              {tLegal("impressumLink")}
            </Link>
            <Separator orientation="vertical" className="h-3" />
            <Link
              href={`/${locale}/datenschutz`}
              className="hover:text-foreground transition-colors px-2 py-1"
            >
              {tLegal("datenschutzLink")}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
