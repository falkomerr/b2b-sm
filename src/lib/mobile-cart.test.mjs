import { describe, expect, test } from "bun:test";
import {
  getCartItemMeta,
  getSelectionCopy,
  reconcileSelectedCartIds,
} from "./mobile-cart.ts";

describe("reconcileSelectedCartIds", () => {
  test("keeps manual deselection and auto-selects only new cart items", () => {
    const nextSelection = reconcileSelectedCartIds({
      cartProductIds: ["fish-1", "fish-2", "fish-3"],
      previousCartProductIds: ["fish-1", "fish-2"],
      selectedProductIds: ["fish-1"],
    });

    expect(nextSelection).toEqual(["fish-1", "fish-3"]);
  });

  test("removes ids that are no longer present in the cart", () => {
    const nextSelection = reconcileSelectedCartIds({
      cartProductIds: ["fish-2"],
      previousCartProductIds: ["fish-1", "fish-2"],
      selectedProductIds: ["fish-1", "fish-2"],
    });

    expect(nextSelection).toEqual(["fish-2"]);
  });
});

describe("getCartItemMeta", () => {
  test("builds caption from category and quantity", () => {
    expect(
      getCartItemMeta({
        categoryName: "Форель",
        quantity: 3,
        unit: "piece",
      }),
    ).toBe("Форель • 3 шт");
  });

  test("uses generic fallback when category is missing", () => {
    expect(
      getCartItemMeta({
        categoryName: "",
        quantity: 0.25,
        unit: "kg",
      }),
    ).toBe("Поставка из общего каталога • 0.25 кг");
  });
});

describe("getSelectionCopy", () => {
  test("shows cancel copy when all items are selected", () => {
    expect(getSelectionCopy({ totalCount: 3, selectedCount: 3 })).toEqual({
      toggleLabel: "Отменить выбор",
      deleteLabel: "Удалить • 3",
    });
  });

  test("shows select-all copy when not every item is selected", () => {
    expect(getSelectionCopy({ totalCount: 4, selectedCount: 2 })).toEqual({
      toggleLabel: "Выбрать все",
      deleteLabel: "Удалить • 2",
    });
  });
});
