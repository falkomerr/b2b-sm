import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const projectRoot = path.resolve(import.meta.dir, "..", "..");

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("image performance regressions", () => {
  test("home page keeps product selection centralized", () => {
    const homePageSource = readProjectFile("src/app/page.tsx");

    expect(homePageSource).toContain("setProducts(selectHomeProducts(loadedProducts));");
  });

  test("product image surfaces keep Next.js optimization enabled", () => {
    const files = [
      "src/app/page.tsx",
      "src/components/cart-panel.tsx",
      "src/app/cart/page.tsx",
      "src/app/orders/[orderId]/page.tsx",
    ];

    for (const file of files) {
      expect(readProjectFile(file)).not.toContain("unoptimized");
    }
  });
});
