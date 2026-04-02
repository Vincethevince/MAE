import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-muted-foreground/30 select-none">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t("notFound")}</h1>
      <p className="mt-2 text-muted-foreground max-w-sm">{t("notFoundDescription")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
