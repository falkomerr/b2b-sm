import { describe, expect, test } from "bun:test";
import nextConfig from "../../next.config.ts";

describe("next.config", () => {
  test("proxies backend asset requests to production backend", async () => {
    expect(typeof nextConfig.rewrites).toBe("function");

    const rewrites = await nextConfig.rewrites();

    expect(rewrites).toEqual([
      {
        source: "/backend-assets/:path*",
        destination: "https://land.smartforel.com/:path*",
      },
    ]);
  });

  test("allows optimizing backend-hosted product images", () => {
    expect(nextConfig.images).toEqual({
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
    });
  });
});
