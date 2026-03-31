import { describe, expect, test } from "bun:test";
import { appRoutes, getOrderDetailsRoute } from "./app-routes.ts";

describe("appRoutes", () => {
  test("exposes home route at root", () => {
    expect(appRoutes.home).toBe("/");
  });

  test("does not expose deprecated catalog route", () => {
    expect("catalog" in appRoutes).toBe(false);
  });

  test("keeps a dedicated cart page", () => {
    expect(appRoutes.cart).toBe("/cart");
  });

  test("builds dedicated order details routes", () => {
    expect(getOrderDetailsRoute("order-42")).toBe("/orders/order-42");
    expect(getOrderDetailsRoute("order/42")).toBe("/orders/order%2F42");
  });
});
