"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface LocaleSwitcherProps {
  locale: string;
}

function buildAlternateUrl(pathname: string, currentLocale: string): string {
  const targetLocale = currentLocale === "de" ? "en" : "de";
  const defaultLocale = "de";

  // Strip current locale prefix (only non-default locales have one)
  let bare = pathname;
  if (currentLocale !== defaultLocale) {
    const prefix = `/${currentLocale}`;
    if (pathname === prefix) {
      bare = "/";
    } else if (pathname.startsWith(`${prefix}/`)) {
      bare = pathname.slice(prefix.length);
    }
  }

  // Add target locale prefix (only for non-default)
  if (targetLocale === defaultLocale) {
    return bare;
  }
  return `/${targetLocale}${bare === "/" ? "" : bare}`;
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const targetLocale = locale === "de" ? "en" : "de";
  const href = buildAlternateUrl(pathname, locale);

  return (
    <Link
      href={href}
      className="text-xs font-semibold px-2 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      aria-label={`Switch to ${targetLocale === "de" ? "German" : "English"}`}
    >
      {targetLocale.toUpperCase()}
    </Link>
  );
}
