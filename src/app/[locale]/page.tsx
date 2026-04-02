import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SearchForm } from "@/components/features/SearchForm";
import { ByTimeSearchForm } from "@/components/features/ByTimeSearchForm";

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const CATEGORY_SLUGS = [
  "friseur",
  "kosmetik",
  "nagelstudio",
  "massage",
  "physiotherapie",
  "tattoostudio",
  "barbershop",
  "waxing",
] as const;

const CATEGORY_ICONS: Record<string, string> = {
  friseur: "✂️",
  kosmetik: "💄",
  nagelstudio: "💅",
  massage: "🤲",
  physiotherapie: "🏃",
  tattoostudio: "🖋️",
  barbershop: "💈",
  waxing: "✨",
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations("home.hero");
  const tCat = await getTranslations("home.categories");
  const tSearch = await getTranslations("search");
  const tBy = await getTranslations("search.byTimeSearch");

  return (
    <main className="flex flex-col">
      {/* Hero section */}
      <section className="flex flex-col items-center justify-center bg-muted/30 px-4 py-20">
        <div className="max-w-3xl w-full text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600">{t("subtitle")}</p>
        </div>

        <div className="w-full max-w-3xl">
          <SearchForm locale={locale} />
        </div>
      </section>

      {/* Find by availability section */}
      <section className="flex flex-col items-center justify-center border-t bg-background px-4 py-16">
        <div className="max-w-3xl w-full">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold">{tBy("title")}</h2>
            <p className="mt-2 text-muted-foreground">{tBy("subtitle")}</p>
          </div>
          <ByTimeSearchForm locale={locale} />
        </div>
      </section>

      {/* Categories section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">{tCat("title")}</h2>
            <p className="mt-2 text-muted-foreground">{tCat("subtitle")}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {CATEGORY_SLUGS.map((slug) => (
              <Link
                key={slug}
                href={`/${locale}/search?category=${slug}`}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border bg-card p-6 text-center transition-shadow hover:shadow-md hover:border-primary"
              >
                <span className="text-3xl" aria-hidden="true">
                  {CATEGORY_ICONS[slug]}
                </span>
                <span className="text-sm font-medium">
                  {tSearch(`categories.${slug}`)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
