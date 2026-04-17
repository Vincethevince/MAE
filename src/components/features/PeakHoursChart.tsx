import type { PeakHourData } from "@/lib/supabase/queries";

interface PeakHoursChartProps {
  data: PeakHourData[];
  noDataLabel: string;
}

export function PeakHoursChart({ data, noDataLabel }: PeakHoursChartProps) {
  const hasData = data.some((d) => d.bookingCount > 0);

  if (!hasData) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{noDataLabel}</p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.bookingCount));
  const half = maxCount / 2;

  const SVG_WIDTH = 560;
  const SVG_HEIGHT = 160;
  const PADDING_LEFT = 8;
  const PADDING_RIGHT = 8;
  const PADDING_BOTTOM = 24;
  const PADDING_TOP = 20;
  const BAR_AREA_HEIGHT = SVG_HEIGHT - PADDING_BOTTOM - PADDING_TOP;
  const n = 24;
  const totalWidth = SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const barGap = totalWidth / n;
  const barWidth = Math.floor(barGap * 0.65);

  const labeledHours = new Set([0, 3, 6, 9, 12, 15, 18, 21]);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="w-full"
        aria-label="Peak hours chart"
        role="img"
      >
        {data.map((point) => {
          const { hour, bookingCount } = point;
          const heightRatio = maxCount > 0 ? bookingCount / maxCount : 0;
          const barH = Math.max(heightRatio * BAR_AREA_HEIGHT, bookingCount > 0 ? 2 : 0);
          const x = PADDING_LEFT + hour * barGap + (barGap - barWidth) / 2;
          const y = PADDING_TOP + BAR_AREA_HEIGHT - barH;
          const isMax = bookingCount === maxCount && bookingCount > 0;
          const showLabel = bookingCount > 0 && bookingCount > half;

          return (
            <g key={hour}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={2}
                fill={isMax ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.35)"}
              />
              {showLabel && (
                <text
                  x={x + barWidth / 2}
                  y={y - 3}
                  textAnchor="middle"
                  fontSize={8}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                >
                  {bookingCount}
                </text>
              )}
              {labeledHours.has(hour) && (
                <text
                  x={x + barWidth / 2}
                  y={SVG_HEIGHT - 6}
                  textAnchor="middle"
                  fontSize={9}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                >
                  {hour}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
