import { describe, expect, test } from "bun:test";
import { resolveAssetUrl } from "./api.ts";

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
