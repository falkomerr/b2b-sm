import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: "https://land.smartforel.com/api/:path*",
      },
      {
        source: "/backend-assets/:path*",
        destination: "https://land.smartforel.com/:path*",
      },
    ];
  },
};

export default nextConfig;
