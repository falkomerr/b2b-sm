import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const projectRoot = path.resolve(import.meta.dir, "..", "..");

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("order acceptance UI wiring", () => {
  test("cart page disables checkout when the acceptance window is closed", () => {
    const source = readProjectFile("src/app/cart/page.tsx");

    expect(source).toContain("ORDER_ACCEPTANCE_CLOSED_MESSAGE");
    expect(source).toContain("const orderAcceptanceOpen = isOrderAcceptanceOpen()");
    expect(source).toContain("availabilityMessage={orderAcceptanceMessage}");
    expect(source).toContain("checkoutDisabled={!orderAcceptanceOpen}");
  });

  test("cart panel uses the shared order acceptance message", () => {
    const source = readProjectFile("src/components/cart-panel.tsx");

    expect(source).toContain("ORDER_ACCEPTANCE_CLOSED_MESSAGE");
    expect(source).toContain("const orderAcceptanceOpen = isOrderAcceptanceOpen()");
    expect(source).toContain("disabled={!cart.length || isSubmitting || !orderAcceptanceOpen}");
  });

  test("home page shows the explicit Bishkek acceptance window without the legacy CTA", () => {
    const source = readProjectFile("src/app/page.tsx");

    expect(source).toContain("ORDER_ACCEPTANCE_WINDOW_LABEL");
    expect(source).toContain("Заказы принимаются ежедневно");
    expect(source).toContain("с {ORDER_ACCEPTANCE_WINDOW_LABEL} по Бишкеку");
    expect(source).not.toContain("Уточнить период");
  });
});
