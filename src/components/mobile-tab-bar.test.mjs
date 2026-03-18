import { describe, expect, test } from "bun:test";
import { getIndicatorStyle } from "./mobile-tab-bar.tsx";

describe("getIndicatorStyle", () => {
  test("uses measured pixel values when indicator is measured", () => {
    expect(
      getIndicatorStyle({
        activeTabIndex: 1,
        indicatorRect: { left: 24, width: 64 },
        hasMeasured: true,
        tabCount: 3,
      }),
    ).toEqual({
      "--indicator-left": "24px",
      "--indicator-width": "64px",
    });
  });

  test("falls back to percentage-based values before first measurement", () => {
    expect(
      getIndicatorStyle({
        activeTabIndex: 1,
        indicatorRect: { left: 0, width: 0 },
        hasMeasured: false,
        tabCount: 4,
      }),
    ).toEqual({
      "--indicator-left": "25%",
      "--indicator-width": "25%",
    });
  });
});
