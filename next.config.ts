import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: "https://land.smartforel.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
