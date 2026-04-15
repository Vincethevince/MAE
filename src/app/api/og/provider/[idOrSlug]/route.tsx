import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getProviderById } from "@/lib/supabase/queries";

export const runtime = "edge";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

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

function stars(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idOrSlug: string }> }
): Promise<Response> {
  const { idOrSlug } = await params;

  if (!UUID_RE.test(idOrSlug) && !SLUG_RE.test(idOrSlug)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const provider = await getProviderById(supabase, idOrSlug);

  if (!provider) {
    return new Response("Not found", { status: 404 });
  }

  const icon = CATEGORY_ICONS[provider.category] ?? "📅";
  const locationLine = [provider.city, provider.postal_code]
    .filter(Boolean)
    .join(", ");
  const ratingDisplay =
    provider.review_count > 0
      ? `${stars(provider.rating ?? 0)}  ${(provider.rating ?? 0).toFixed(1)} (${provider.review_count})`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)",
          padding: "56px 64px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          }}
        />

        {/* Category icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: 16,
              background: "rgba(99, 102, 241, 0.15)",
              fontSize: 40,
            }}
          >
            {icon}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 14, color: "#a1a1aa", letterSpacing: 2, textTransform: "uppercase" }}>
              {provider.category}
            </span>
            {locationLine && (
              <span style={{ fontSize: 14, color: "#71717a", marginTop: 2 }}>
                📍 {locationLine}
              </span>
            )}
          </div>
        </div>

        {/* Business name */}
        <div
          style={{
            fontSize: provider.business_name.length > 30 ? 44 : 56,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.1,
            letterSpacing: -1,
            marginBottom: 24,
            maxWidth: 800,
          }}
        >
          {provider.business_name}
        </div>

        {/* Rating */}
        {ratingDisplay && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 20, color: "#fbbf24" }}>
              {stars(provider.rating ?? 0)}
            </span>
            <span style={{ fontSize: 18, color: "#d4d4d8", fontWeight: 600 }}>
              {(provider.rating ?? 0).toFixed(1)}
            </span>
            <span style={{ fontSize: 16, color: "#71717a" }}>
              ({provider.review_count} Bewertungen)
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 16,
              color: "#a1a1aa",
              fontWeight: 500,
            }}
          >
            MAE – Make Appointments Easier
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              color: "#ffffff",
              borderRadius: 8,
              padding: "10px 20px",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Jetzt buchen →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
