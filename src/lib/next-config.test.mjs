import { describe, expect, test } from "bun:test";
import nextConfig from "../../next.config.ts";

describe("next.config", () => {
  test("proxies backend-api requests to production backend", async () => {
    expect(typeof nextConfig.rewrites).toBe("function");

    const rewrites = await nextConfig.rewrites();

    expect(rewrites).toEqual([
      {
        source: "/backend-api/:path*",
        destination: "https://land.smartforel.com/api/:path*",
      },
      {
        source: "/backend-assets/:path*",
        destination: "https://land.smartforel.com/:path*",
      },
    ]);
  });
});
