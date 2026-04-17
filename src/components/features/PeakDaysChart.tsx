import type { PeakDayData } from "@/lib/supabase/queries";

interface PeakDaysChartProps {
  data: PeakDayData[];
  dayLabels: string[];
  noDataLabel: string;
}

export function PeakDaysChart({ data, dayLabels, noDataLabel }: PeakDaysChartProps) {
  const hasData = data.some((d) => d.bookingCount > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{noDataLabel}</p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.bookingCount));

  const SVG_WIDTH = 560;
  const SVG_HEIGHT = 160;
  const PADDING_LEFT = 8;
  const PADDING_RIGHT = 8;
  const PADDING_BOTTOM = 24;
  const PADDING_TOP = 20;
  const BAR_AREA_HEIGHT = SVG_HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const n = 7;
  const totalWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const barGap = totalWidth / n;
  const barWidth = Math.floor(barGap * 0.55);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full"
        aria-label="Peak days chart"
        role="img"
      >
        {data.map((point) => {
          const { dayOfWeek, bookingCount } = point;
          const heightRatio = maxCount > 0 ? bookingCount / maxCount : 0;
          const barH = Math.max(heightRatio * BAR_AREA_HEIGHT, bookingCount > 0 ? 2 : 0);
          const x = PADDING_LEFT + dayOfWeek * barGap + (barGap - barWidth) / 2;
          const y = PADDING_TOP + BAR_AREA_HEIGHT - barH;
          const isMax = bookingCount === maxCount && bookingCount > 0;
          const label = dayLabels[dayOfWeek] ?? String(dayOfWeek);

          return (
            <g key={dayOfWeek}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={isMax ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"}
              />
              {bookingCount > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                >
                  {bookingCount}
                </text>
              )}
              <text
                x={x + barWidth / 2}
                y={SVG_HEIGHT - 6}
                textAnchor="middle"
                fontSize={10}
                fill={isMax ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"}
                fontWeight={isMax ? "600" : "400"}
                className="select-none"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
