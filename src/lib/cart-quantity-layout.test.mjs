import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const projectRoot = path.resolve(import.meta.dir, "..", "..");

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("cart quantity layout", () => {
  test("cart page stacks availability and quantity control on mobile", () => {
    const source = readProjectFile("src/app/cart/page.tsx");

    expect(source).toContain("flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between");
    expect(source).toContain('<div className="max-w-full self-stretch sm:self-auto">');
  });

  test("quantity control keeps the kg input shrinkable on narrow screens", () => {
    const source = readProjectFile("src/components/quantity-control.tsx");

    expect(source).toContain("flex max-w-full flex-wrap items-center gap-2");
    expect(source).toContain("w-12 min-w-0");
  });
});
