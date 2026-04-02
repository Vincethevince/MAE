"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Log to error monitoring in production
    if (process.env.NODE_ENV === "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error.digest ?? error.message);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-7xl font-bold text-muted-foreground/30 select-none">500</p>
      <h1 className="mt-4 text-2xl font-bold">{t("serverError")}</h1>
      <p className="mt-2 text-muted-foreground max-w-sm">{t("serverErrorDescription")}</p>
      <button
        onClick={reset}
        className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}
