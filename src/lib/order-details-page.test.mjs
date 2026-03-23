import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const projectRoot = path.resolve(import.meta.dir, "..", "..");

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("order details page regressions", () => {
  test("order fetch effect is not tied to recentOrders updates", () => {
    const source = readProjectFile("src/app/orders/[orderId]/page.tsx");

    expect(source).toContain("recentOrdersRef.current = recentOrders;");
    expect(source).toContain("}, [orderId, reloadToken, session]);");
    expect(source).not.toContain("}, [orderId, recentOrders, reloadToken, session]);");
  });

  test("catalog fetch effect does not self-cancel on catalogLoading changes", () => {
    const source = readProjectFile("src/app/orders/[orderId]/page.tsx");

    expect(source).toContain("const [catalogLoaded, setCatalogLoaded] = useState(false);");
    expect(source).toContain("setCatalogLoaded(true);");
    expect(source).toContain("}, [catalogError, catalogLoaded, isEditing, session]);");
    expect(source).not.toContain(
      "}, [catalogError, catalogLoading, catalogProducts.length, isEditing, session]);",
    );
  });

  test("page source no longer hardcodes piece-only quantity labels", () => {
    const source = readProjectFile("src/app/orders/[orderId]/page.tsx");

    expect(source).toContain("formatQuantity(");
    expect(source).toContain("formatPricePerUnit(");
    expect(source).not.toContain("/ шт");
  });
});
