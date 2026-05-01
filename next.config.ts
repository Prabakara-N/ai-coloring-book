import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/generate",
        destination: "/playground",
        permanent: true,
      },
      {
        source: "/generate/:path*",
        destination: "/playground/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
