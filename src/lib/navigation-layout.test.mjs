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

  test("protected shell docks the mobile tab bar in a fixed bottom container", () => {
    const source = readProjectFile("src/components/protected-shell.tsx");

    expect(source).toContain("fixed inset-x-0 bottom-0 z-30");
    expect(source).toContain("md:hidden");
  });
});
