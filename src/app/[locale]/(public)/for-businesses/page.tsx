import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forBusinesses" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ForBusinessesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "forBusinesses" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const steps = [
    { title: t("howItWorks.step1Title"), body: t("howItWorks.step1Body"), number: "1" },
    { title: t("howItWorks.step2Title"), body: t("howItWorks.step2Body"), number: "2" },
    { title: t("howItWorks.step3Title"), body: t("howItWorks.step3Body"), number: "3" },
  ];

  const freeItems = [
    t("pricing.item1"),
    t("pricing.item2"),
    t("pricing.item3"),
    t("pricing.item4"),
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/50 to-background py-20 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/${locale}/register?role=provider`}
              className={buttonVariants({ size: "lg" })}
            >
              {t("hero.cta")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {t("hero.ctaLogin")}
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-12">{t("howItWorks.title")}</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/40 py-16 px-4">
        <div className="mx-auto max-w-md text-center">
          <h2 className="text-2xl font-bold mb-8">{t("pricing.title")}</h2>
          <div className="rounded-2xl border bg-background p-8 shadow-sm">
            <div className="text-4xl font-bold">
              {t("pricing.freeTitle")}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t("pricing.freeDescription")}</p>
            <ul className="mt-6 space-y-3 text-left">
              {freeItems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">{t("pricing.note")}</p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold">{t("cta.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("cta.subtitle")}</p>
          <div className="mt-6">
            <Link
              href={`/${locale}/register?role=provider`}
              className={buttonVariants({ size: "lg" })}
            >
              {t("cta.button")}
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("pricing.note")}</p>
        </div>
      </section>

      {/* Back to customer side */}
      <div className="pb-8 text-center text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="hover:text-foreground transition-colors">
          ← {tCommon("search")} {tCommon("appName")}
        </Link>
      </div>
    </div>
  );
}
