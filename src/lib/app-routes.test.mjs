import { describe, expect, test } from "bun:test";
import { appRoutes, getOrderDetailsRoute, primaryNavigation } from "./app-routes.ts";

describe("appRoutes", () => {
  test("exposes home route at root", () => {
    expect(appRoutes.home).toBe("/");
  });

  test("uses a dedicated cart page in primary navigation", () => {
    expect(appRoutes.cart).toBe("/cart");
    expect(primaryNavigation).toContainEqual({
      href: appRoutes.cart,
      label: "Корзина",
    });
    expect(primaryNavigation.every((item) => !item.href.includes("#cart"))).toBe(true);
  });

  test("builds dedicated order details routes", () => {
    expect(getOrderDetailsRoute("order-42")).toBe("/orders/order-42");
    expect(getOrderDetailsRoute("order/42")).toBe("/orders/order%2F42");
  });
});
