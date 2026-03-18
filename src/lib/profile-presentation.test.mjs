import { describe, expect, test } from "bun:test";
import {
  formatOrderDateTime,
  formatOrderMoney,
  formatOrderStatusLabel,
  formatOrderStatusTone,
  getOrderItemCount,
} from "./profile-presentation.ts";

function makeOrder(overrides = {}) {
  return {
    id: "order-1",
    orderedByFullName: "Петр Петров",
    companyNameSnapshot: "Smartfish",
    price: 23083,
    currency: "KGS",
    statusId: "D",
    dateInsert: "2026-03-10T16:13:00+06:00",
    items: [
      {
        id: "item-1",
        productId: "product-1",
        productName: "Филе",
        quantity: 8,
        price: 1300,
      },
      {
        id: "item-2",
        productId: "product-2",
        productName: "Стейк",
        quantity: 6,
        price: 2100,
      },
    ],
    ...overrides,
  };
}

describe("profile presentation", () => {
  test("formats order money in soms", () => {
    expect(formatOrderMoney(23083, "KGS")).toBe("23 083 сом");
    expect(formatOrderMoney(7784, "USD")).toBe("7 784 USD");
  });

  test("formats order date for mobile cards", () => {
    expect(formatOrderDateTime("2026-03-10T16:13:00+06:00")).toBe(
      "10.03.2026, 16:13",
    );
  });

  test("maps order statuses to figma labels and tones", () => {
    expect(formatOrderStatusLabel("D")).toBe("Доставлен");
    expect(formatOrderStatusLabel("C")).toBe("Отменен");
    expect(formatOrderStatusLabel("P")).toBe("В обработке");
    expect(formatOrderStatusTone("D")).toBe("success");
    expect(formatOrderStatusTone("C")).toBe("danger");
    expect(formatOrderStatusTone("P")).toBe("neutral");
  });

  test("calculates total ordered pieces", () => {
    expect(getOrderItemCount(makeOrder())).toBe(14);
  });
});
