import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin();

export async function headers() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const wsUrl = process.env.WS_URL || "";
  const connect = ["'self'", apiBase, wsUrl].filter(Boolean).join(" ");

  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy",
          value: "geolocation=(), microphone=(), camera=(), payment=(), accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), bluetooth=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), gamepad=(), gyroscope=(), magnetometer=(), midi=(), picture-in-picture=(), publickey-credentials-get=(*)" },
        { key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            // allow next/image remote images
            "img-src 'self' https://avatars.githubusercontent.com data: blob:",
            "font-src 'self' data:",
            `connect-src ${connect}`,
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
          ].join("; ") }
      ]
    }
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.vercel-storage.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" }
    ]
  },
  experimental: {
    optimizePackageImports: [
      "react",
      "react-dom",
      "lucide-react"
    ]
  }
};

export default withNextIntl(nextConfig);
