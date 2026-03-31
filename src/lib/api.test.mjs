import { describe, expect, test } from "bun:test";
import { normalizeAssetSource, resolveApiBaseUrl, resolveAssetUrl } from "./api.ts";

const DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0W8AAAAASUVORK5CYII=";

describe("resolveAssetUrl", () => {
  test("drops inline data URLs", () => {
    expect(resolveAssetUrl(DATA_URL)).toBeUndefined();
  });

  test("drops blob URLs", () => {
    expect(resolveAssetUrl("blob:https://b2b.smartforel.com/product-image")).toBeUndefined();
  });

  test("resolves relative asset paths through same-origin asset proxy by default", () => {
    expect(resolveAssetUrl("/products/item.jpg")).toBe(
      "/backend-assets/static/products/item.webp",
    );
    expect(resolveAssetUrl("products/item.jpg")).toBe(
      "/backend-assets/static/products/item.webp",
    );
  });

  test("returns undefined for blank values", () => {
    expect(resolveAssetUrl("   ")).toBeUndefined();
    expect(resolveAssetUrl(null)).toBeUndefined();
    expect(resolveAssetUrl(undefined)).toBeUndefined();
  });
});

describe("normalizeAssetSource", () => {
  test("normalizes legacy product asset paths to static webp", () => {
    expect(normalizeAssetSource("/products/item.jpg")).toBe("/static/products/item.webp");
    expect(normalizeAssetSource("https://land.smartforel.com/products/item.JPG")).toBe(
      "/static/products/item.webp",
    );
  });

  test("drops inline and blob asset sources", () => {
    expect(normalizeAssetSource(DATA_URL)).toBeUndefined();
    expect(normalizeAssetSource("blob:https://b2b.smartforel.com/product-image")).toBeUndefined();
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
    ).toBe("/backend-assets/static/products/item.webp");
  });

  test("proxies absolute backend asset URLs on public hosts", () => {
    expect(
      resolveAssetUrl("https://land.smartforel.com/products/item.jpg", {
        browserHost: "b2b.smartforel.com",
      }),
    ).toBe("/backend-assets/static/products/item.webp");
  });
});
