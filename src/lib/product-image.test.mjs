import { describe, expect, test } from "bun:test";
import { productFallbackImageSrc, resolveProductImageUrl } from "./product-image.ts";

describe("product image helpers", () => {
  test("falls back to shared product image when product picture is missing", () => {
    expect(resolveProductImageUrl()).toBe(productFallbackImageSrc);
    expect(resolveProductImageUrl(null)).toBe(productFallbackImageSrc);
    expect(resolveProductImageUrl("   ")).toBe(productFallbackImageSrc);
  });

  test("preserves resolved product image urls when product picture exists", () => {
    expect(resolveProductImageUrl("/products/item.jpg")).toBe(
      "/backend-assets/static/products/item.webp",
    );
  });
});
