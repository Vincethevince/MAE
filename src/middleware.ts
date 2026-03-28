import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";

import { locales, defaultLocale } from "@/i18n/config";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
});

export async function middleware(request: NextRequest) {
  // Refresh Supabase session
  const supabaseResponse = await updateSession(request);

  // Handle i18n routing
  const intlResponse = intlMiddleware(request);

  // Merge cookies from Supabase into intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
