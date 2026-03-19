import { describe, expect, test } from "bun:test";
import { resolveApiBaseUrl, resolveAssetUrl } from "./api.ts";

const DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0W8AAAAASUVORK5CYII=";

describe("resolveAssetUrl", () => {
  test("keeps data URLs unchanged", () => {
    expect(resolveAssetUrl(DATA_URL)).toBe(DATA_URL);
  });

  test("resolves relative asset paths against backend origin", () => {
    expect(resolveAssetUrl("/products/item.jpg")).toBe(
      "http://localhost:3001/products/item.jpg",
    );
    expect(resolveAssetUrl("products/item.jpg")).toBe(
      "http://localhost:3001/products/item.jpg",
    );
  });

  test("returns undefined for blank values", () => {
    expect(resolveAssetUrl("   ")).toBeUndefined();
    expect(resolveAssetUrl(null)).toBeUndefined();
    expect(resolveAssetUrl(undefined)).toBeUndefined();
  });
});

describe("resolveApiBaseUrl", () => {
  test("keeps local backend for localhost", () => {
    expect(resolveApiBaseUrl({ browserHost: "localhost" })).toBe(
      "http://localhost:3001/api",
    );
    expect(resolveApiBaseUrl({ browserHost: "127.0.0.1" })).toBe(
      "http://localhost:3001/api",
    );
  });

  test("uses same-origin proxy on public hosts", () => {
    expect(resolveApiBaseUrl({ browserHost: "b2b.smartforel.com" })).toBe(
      "/backend-api",
    );
  });

  test("prefers explicit api base URL", () => {
    expect(
      resolveApiBaseUrl({
        browserHost: "b2b.smartforel.com",
        configuredApiBaseUrl: "https://api.example.com/v1",
      }),
    ).toBe("https://api.example.com/v1");
  });
});

describe("resolveAssetUrl on public hosts", () => {
  test("resolves relative asset paths through same-origin asset proxy", () => {
    expect(
      resolveAssetUrl("/products/item.jpg", {
        browserHost: "b2b.smartforel.com",
      }),
    ).toBe("/backend-assets/products/item.jpg");
  });

  test("proxies absolute backend asset URLs on public hosts", () => {
    expect(
      resolveAssetUrl("https://land.smartforel.com/products/item.jpg", {
        browserHost: "b2b.smartforel.com",
      }),
    ).toBe("/backend-assets/products/item.jpg");
  });
});
