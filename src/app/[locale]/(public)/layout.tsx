import type { ReactNode } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";

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

  const t = await getTranslations("common");

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
              <Link
                href={`/${locale}/dashboard`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("appName")}
              </Link>
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

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("appName")} – {t("tagline")}
      </footer>
    </div>
  );
}
