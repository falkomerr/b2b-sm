import { describe, expect, test } from "bun:test";
import {
  addProductToOrderEditDraft,
  createOrderEditDraft,
  getOrderEditDraftTotal,
  getOrderEditDraftValidationError,
  removeProductFromOrderEditDraft,
  syncOrderEditDraftWithCatalogProducts,
  toUpdateOrderPayload,
  updateOrderEditDraftItemQuantity,
} from "./order-edit-draft.ts";

function makeOrder(overrides = {}) {
  return {
    id: "order-1",
    orderedByFullName: "Иван Иванов",
    comments: "Позвонить заранее",
    address: {
      street: "Манаса",
      building: "10",
      city: "Бишкек",
    },
    price: 2000,
    currency: "KGS",
    statusId: "N",
    dateInsert: "2026-03-20T10:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: "product-1",
        productName: "Филе форели",
        quantity: 2,
        price: 1000,
        imageUrl: "/products/trout.webp",
      },
    ],
    ...overrides,
  };
}

describe("order edit draft helpers", () => {
  test("creates editable draft from order details", () => {
    expect(createOrderEditDraft(makeOrder())).toEqual({
      orderId: "order-1",
      orderedByFullName: "Иван Иванов",
      comments: "Позвонить заранее",
      address: {
        street: "Манаса",
        building: "10",
        city: "Бишкек",
      },
      currency: "KGS",
      items: [
        {
          id: "item-1",
          productId: "product-1",
          productName: "Филе форели",
          quantity: 2,
          price: 1000,
          imageUrl: "/static/products/trout.webp",
        },
      ],
    });
  });

  test("adds a new product and merges quantity for an existing one", () => {
    const initial = createOrderEditDraft(makeOrder());
    const withExisting = addProductToOrderEditDraft(initial, {
      id: "product-1",
      name: "Филе форели",
      price: 900,
      currency: "KGS",
      quantity: 10,
      available: true,
      picture: "/products/trout-new.webp",
    });
    const withNew = addProductToOrderEditDraft(withExisting, {
      id: "product-2",
      name: "Стейк лосося",
      price: 800,
      currency: "KGS",
      quantity: 5,
      available: true,
      picture: "/products/salmon.webp",
    });

    expect(withNew.items).toEqual([
      {
        id: "item-1",
        productId: "product-1",
        productName: "Филе форели",
        quantity: 3,
        price: 900,
        imageUrl: "/static/products/trout-new.webp",
      },
      {
        id: "product-2",
        productId: "product-2",
        productName: "Стейк лосося",
        quantity: 1,
        price: 800,
        imageUrl: "/static/products/salmon.webp",
      },
    ]);
  });

  test("updates quantity, removes items and recalculates total", () => {
    const initial = createOrderEditDraft(
      makeOrder({
        items: [
          {
            id: "item-1",
            productId: "product-1",
            productName: "Филе форели",
            quantity: 2,
            price: 1000,
          },
          {
            id: "item-2",
            productId: "product-2",
            productName: "Стейк лосося",
            quantity: 1,
            price: 800,
          },
        ],
      }),
    );

    const updated = updateOrderEditDraftItemQuantity(initial, "product-1", 5);
    const removed = removeProductFromOrderEditDraft(updated, "product-2");

    expect(removed.items).toEqual([
      {
        id: "item-1",
        productId: "product-1",
        productName: "Филе форели",
        quantity: 5,
        price: 1000,
      },
    ]);
    expect(getOrderEditDraftTotal(removed)).toBe(5000);
  });

  test("syncs catalog data without double-resolving product image urls", () => {
    const initial = createOrderEditDraft(makeOrder());

    expect(
      syncOrderEditDraftWithCatalogProducts(initial, [
        {
          id: "product-1",
          name: "Филе форели",
          price: 900,
          currency: "KGS",
          quantity: 10,
          available: true,
          picture: "/backend-assets/static/products/trout-new.webp",
        },
      ]),
    ).toEqual({
      ...initial,
      items: [
        {
          id: "item-1",
          productId: "product-1",
          productName: "Филе форели",
          quantity: 2,
          price: 900,
          imageUrl: "/backend-assets/static/products/trout-new.webp",
        },
      ],
    });
  });

  test("validates non-empty items and required buyer full name", () => {
    const emptyName = createOrderEditDraft(
      makeOrder({ orderedByFullName: "   " }),
    );
    const emptyItems = removeProductFromOrderEditDraft(
      createOrderEditDraft(makeOrder()),
      "product-1",
    );

    expect(getOrderEditDraftValidationError(emptyName)).toBe(
      "Укажите ФИО оформляющего.",
    );
    expect(getOrderEditDraftValidationError(emptyItems)).toBe(
      "В заказе не осталось товаров.",
    );
  });

  test("builds update payload without editable address field", () => {
    expect(toUpdateOrderPayload(createOrderEditDraft(makeOrder()))).toEqual({
      items: [{ productId: "product-1", quantity: 2 }],
      orderedByFullName: "Иван Иванов",
      comments: "Позвонить заранее",
    });
  });
});
