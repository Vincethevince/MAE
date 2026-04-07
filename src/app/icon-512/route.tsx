import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#18181b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 108,
        }}
      >
        <span
          style={{
            color: "#ffffff",
            fontSize: 192,
            fontWeight: 700,
            letterSpacing: "-6px",
            fontFamily: "sans-serif",
          }}
        >
          MAE
        </span>
      </div>
    ),
    {
      width: 512,
      height: 512,
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Type": "image/png",
      },
    }
  );
}
