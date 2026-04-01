import type { NextConfig } from "next";

const PRODUCTION_BACKEND_ASSET_ORIGIN = "https://land.smartforel.com";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "land.smartforel.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3001",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/backend-assets/:path*",
        destination: `${PRODUCTION_BACKEND_ASSET_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
