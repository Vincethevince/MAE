import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mae-gilt.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/de/dashboard/",
          "/en/dashboard/",
          "/de/profile/",
          "/en/profile/",
          "/de/appointments/",
          "/en/appointments/",
          "/de/saved/",
          "/en/saved/",
          "/de/login",
          "/en/login",
          "/de/register",
          "/en/register",
          "/de/forgot-password",
          "/en/forgot-password",
          "/de/reset-password",
          "/en/reset-password",
          "/de/book/",
          "/en/book/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
