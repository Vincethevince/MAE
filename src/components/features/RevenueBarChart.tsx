/**
 * Pure SVG revenue bar chart — no external dependencies, server-renderable.
 * Displays monthly revenue as vertical bars with labels.
 */

import type { MonthlyRevenue } from "@/lib/supabase/queries";

interface RevenueBarChartProps {
  data: MonthlyRevenue[];
  locale: string;
  noDataLabel: string;
}

function formatEur(cents: number, locale: string): string {
  if (cents === 0) return "—";
  const val = cents / 100;
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(val);
}

function shortMonthLabel(year: number, month: number, locale: string): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
    month: "short",
  });
}

export function RevenueBarChart({ data, locale, noDataLabel }: RevenueBarChartProps) {
  const hasData = data.some((d) => d.revenueCents > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{noDataLabel}</p>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenueCents));

  // SVG dimensions
  const SVG_WIDTH = 560;
  const SVG_HEIGHT = 160;
  const PADDING_LEFT = 8;
  const PADDING_RIGHT = 8;
  const PADDING_BOTTOM = 32; // space for month labels
  const PADDING_TOP = 8;
  const BAR_AREA_HEIGHT = SVG_HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const n = data.length;
  const totalWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const barWidth = Math.floor((totalWidth / n) * 0.55);
  const barGap = totalWidth / n;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full"
        aria-label="Revenue trend chart"
        role="img"
      >
        {data.map((point, i) => {
          const heightRatio = maxRevenue > 0 ? point.revenueCents / maxRevenue : 0;
          const barH = Math.max(heightRatio * BAR_AREA_HEIGHT, point.revenueCents > 0 ? 2 : 0);
          const x = PADDING_LEFT + i * barGap + (barGap - barWidth) / 2;
          const y = PADDING_TOP + BAR_AREA_HEIGHT - barH;
          const isCurrentMonth =
            i === n - 1;

          return (
            <g key={`${point.year}-${point.month}`}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={isCurrentMonth ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"}
              />

              {/* Revenue label above bar (only if bar is tall enough or non-zero) */}
              {point.revenueCents > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                >
                  {formatEur(point.revenueCents, locale)}
                </text>
              )}

              {/* Month label */}
              <text
                x={x + barWidth / 2}
                y={SVG_HEIGHT - 6}
                textAnchor="middle"
                fontSize={10}
                fill={
                  isCurrentMonth
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--muted-foreground))"
                }
                fontWeight={isCurrentMonth ? "600" : "400"}
                className="select-none"
              >
                {shortMonthLabel(point.year, point.month, locale)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
