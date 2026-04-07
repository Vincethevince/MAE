import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// Only allow letters (incl. German umlauts), digits, spaces, hyphens
const SAFE_QUERY_RE = /^[\p{L}\d\s\-]{2,50}$/u;
// Must contain at least one alphanumeric character (reject "- -", "   ", etc.)
const HAS_ALPHANUM_RE = /[\p{L}\d]/u;

interface OpenPlzLocality {
  name: string;
  postalCode: string;
}

export interface GeoSuggestion {
  label: string;
  city: string;
  postalCode: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!SAFE_QUERY_RE.test(q) || !HAS_ALPHANUM_RE.test(q)) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  try {
    const url = `https://openplzapi.org/de/Localities?name=${encodeURIComponent(q)}&language=DE&pageSize=8`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      // Edge fetch: 3-second timeout via AbortSignal
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json([], {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }

    const data = (await res.json()) as OpenPlzLocality[];

    const suggestions: GeoSuggestion[] = data
      .filter((item) => item.name && item.postalCode)
      .map((item) => ({
        label: `${item.postalCode} ${item.name}`,
        city: item.name,
        postalCode: item.postalCode,
      }));

    return NextResponse.json(suggestions, {
      headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
    });
  } catch {
    // Network error or timeout — return empty suggestions, don't crash
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
