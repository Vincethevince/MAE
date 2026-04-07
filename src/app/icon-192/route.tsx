import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-2px",
            fontFamily: "sans-serif",
          }}
        >
          MAE
        </span>
      </div>
    ),
    {
      width: 192,
      height: 192,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Type": "image/png",
      },
    }
  );
}
