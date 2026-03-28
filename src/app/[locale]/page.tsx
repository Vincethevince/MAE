import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  const t = useTranslations("home.hero");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          {t("title")}
        </h1>
        <p className="mt-6 text-lg text-gray-600">{t("subtitle")}</p>
        <div className="mt-10">
          <Button size="lg" className="text-lg px-8 py-6">
            {t("cta")}
          </Button>
        </div>
      </div>
    </main>
  );
}
