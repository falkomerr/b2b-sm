import { describe, expect, test } from "bun:test";
import {
  formatQuantity,
  getInitialQuantityForUnit,
  isManualQuantityInputEnabled,
  parseQuantityInput,
} from "./product-units.ts";

describe("product units", () => {
  test("formats quantity for pieces and kilograms", () => {
    expect(formatQuantity(3, "piece")).toBe("3 шт");
    expect(formatQuantity(1.25, "piece")).toBe("1.25 шт");
    expect(formatQuantity(0.25, "kg")).toBe("0.25 кг");
    expect(formatQuantity(1.5, "kg")).toBe("1.5 кг");
  });

  test("returns initial quantity for each unit", () => {
    expect(getInitialQuantityForUnit("piece")).toBe(1);
    expect(getInitialQuantityForUnit("kg")).toBe(1);
  });

  test("enables manual input for all supported units", () => {
    expect(isManualQuantityInputEnabled("piece")).toBe(true);
    expect(isManualQuantityInputEnabled("kg")).toBe(true);
  });

  test("parses piece quantity with dot or comma and max two decimals", () => {
    expect(parseQuantityInput("2", "piece")).toBe(2);
    expect(parseQuantityInput("2.5", "piece")).toBe(2.5);
    expect(parseQuantityInput("2,5", "piece")).toBe(2.5);
    expect(parseQuantityInput("2.125", "piece")).toBeNull();
  });

  test("parses kg quantity with dot or comma and max two decimals", () => {
    expect(parseQuantityInput("0.25", "kg")).toBe(0.25);
    expect(parseQuantityInput("0,25", "kg")).toBe(0.25);
    expect(parseQuantityInput("0.125", "kg")).toBeNull();
  });
});
