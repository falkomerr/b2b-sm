import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "bun:test";

const projectRoot = path.resolve(import.meta.dir, "..", "..");

function readProjectFile(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

describe("mobile navigation layout", () => {
  test("mobile app frame keeps the tab bar fixed by default", () => {
    const source = readProjectFile("src/components/mobile-app-frame.tsx");

    expect(source).toContain("tabBarFixed = true");
  });

  test("home page uses the shared mobile app frame instead of rendering the tab bar inline", () => {
    const source = readProjectFile("src/app/page.tsx");

    expect(source).toContain("<MobileAppFrame");
    expect(source).not.toContain("<MobileTabBar />");
  });

  test("cart page renders the checkout CTA inline instead of using fixed frame footer", () => {
    const source = readProjectFile("src/app/cart/page.tsx");

    expect(source).not.toContain("footer={");
    expect(source).toContain("<CartFooter");
    expect(source.indexOf("Данные для заказа")).toBeLessThan(source.indexOf("<CartFooter"));
    expect(source).toContain("inline");
  });
});
