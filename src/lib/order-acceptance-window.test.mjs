import { describe, expect, test } from "bun:test";
import {
  ORDER_ACCEPTANCE_CLOSED_MESSAGE,
  ORDER_ACCEPTANCE_TIMEZONE,
  ORDER_ACCEPTANCE_WINDOW_LABEL,
  isOrderAcceptanceOpen,
} from "./order-acceptance-window.ts";

describe("order acceptance window", () => {
  test("keeps the expected public copy", () => {
    expect(ORDER_ACCEPTANCE_TIMEZONE).toBe("Asia/Bishkek");
    expect(ORDER_ACCEPTANCE_WINDOW_LABEL).toBe("06:00-24:00");
    expect(ORDER_ACCEPTANCE_CLOSED_MESSAGE).toBe(
      "Заказы принимаются с 06:00 до 24:00 по времени Бишкека.",
    );
  });

  test("closes before 06:00 Bishkek time", () => {
    expect(isOrderAcceptanceOpen(new Date("2026-03-09T23:59:00.000Z"))).toBe(false);
  });

  test("opens at 06:00 Bishkek time", () => {
    expect(isOrderAcceptanceOpen(new Date("2026-03-10T00:00:00.000Z"))).toBe(true);
  });

  test("stays open through 23:59 Bishkek time", () => {
    expect(isOrderAcceptanceOpen(new Date("2026-03-10T17:59:00.000Z"))).toBe(true);
  });

  test("closes at 24:00 Bishkek time", () => {
    expect(isOrderAcceptanceOpen(new Date("2026-03-10T18:00:00.000Z"))).toBe(false);
  });
});
