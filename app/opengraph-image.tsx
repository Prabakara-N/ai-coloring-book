import { ImageResponse } from "next/og";

export const alt = "CrayonSparks — Generate coloring books in minutes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#05050a",
          backgroundImage:
            "radial-gradient(ellipse at 20% 10%, rgba(139,92,246,0.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 90%, rgba(99,102,241,0.3) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(6,182,212,0.18) 0%, transparent 60%)",
          padding: 60,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background:
                "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg
              width="72"
              height="72"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="translate(4 3) rotate(35 32 32)">
                <polygon points="2,32 12,27 12,37" fill="#ffffff" />
                <polygon points="4,32 12,29.5 12,34.5" fill="#fef3c7" />
                <rect x="12" y="27" width="40" height="10" fill="#ffffff" />
                <rect x="17" y="27" width="3" height="10" fill="#7c3aed" />
                <rect x="48" y="27" width="4" height="10" fill="#cbd5e1" />
              </g>
              <path
                d="M50 10 C50.5 12.7 51.3 13.5 54 14 C51.3 14.5 50.5 15.3 50 18 C49.5 15.3 48.7 14.5 46 14 C48.7 13.5 49.5 12.7 50 10 Z"
                fill="#ffffff"
              />
              <path
                d="M14 49 C14.4 51 15 51.6 17 52 C15 52.4 14.4 53 14 55 C13.6 53 13 52.4 11 52 C13 51.6 13.6 51 14 49 Z"
                fill="#ffffff"
                opacity="0.75"
              />
            </svg>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "white",
              letterSpacing: -0.5,
            }}
          >
            CrayonSparks
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 980,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              letterSpacing: -2,
              lineHeight: 1.05,
              marginBottom: 12,
            }}
          >
            Generate coloring books
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.05,
              background:
                "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 28,
            }}
          >
            in minutes, not months
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#a1a1aa",
              letterSpacing: -0.5,
            }}
          >
            280 prompts · 14 categories · Powered by Gemini Nano Banana
          </div>
        </div>

        {/* Badge */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 999,
            background: "rgba(139, 92, 246, 0.15)",
            border: "1px solid rgba(139, 92, 246, 0.4)",
            color: "#c4b5fd",
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          For Amazon KDP · Etsy · Gumroad sellers
        </div>
      </div>
    ),
    { ...size }
  );
}
