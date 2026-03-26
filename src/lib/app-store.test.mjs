import { describe, expect, test } from "bun:test";
import {
  createClearedPersistedState,
  createCompletedOrderPersistedState,
  writePersistedState,
} from "./app-store.tsx";

function makeOrder(overrides = {}) {
  return {
    id: "order-1",
    orderedByFullName: "Петр Петров",
    companyNameSnapshot: "Smartfish",
    price: 0,
    currency: "KGS",
    statusId: "N",
    dateInsert: "2026-03-18T12:00:00.000Z",
    items: [
      {
        id: "item-1",
        productId: "product-1",
        productName: "Филе",
        quantity: 2,
        price: 0,
      },
    ],
    ...overrides,
  };
}

describe("createClearedPersistedState", () => {
  test("clears cart items and comment while preserving session and buyer name", () => {
    const session = {
      accessToken: "token",
      user: {
        userId: "user-1",
        accountType: "b2b_company",
        name: "Иван Иванов",
      },
    };

    expect(
      createClearedPersistedState({
        session,
        recentOrders: [makeOrder()],
        cart: [
          {
            productId: "product-1",
            productName: "Филе",
            quantity: 2,
            quantityAvailable: 10,
            available: true,
          },
        ],
        orderDraft: {
          orderedByFullName: "Иван Иванов",
          comments: "Доставить утром",
        },
      }),
    ).toEqual({
      session,
      recentOrders: [makeOrder()],
      cart: [],
      orderDraft: {
        orderedByFullName: "Иван Иванов",
        comments: "",
      },
    });
  });

  test("stores a completed order, clears cart, and resets comment", () => {
    const session = {
      accessToken: "token",
      user: {
        userId: "user-1",
        accountType: "b2b_company",
        name: "Иван Иванов",
      },
    };
    const previousOrder = makeOrder({
      id: "order-0",
      orderedByFullName: "Иван Иванов",
    });
    const completedOrder = makeOrder({
      id: "order-2",
      orderedByFullName: "Мария Смирнова",
    });

    expect(
      createCompletedOrderPersistedState(
        {
          session,
          recentOrders: [previousOrder],
          cart: [
            {
              productId: "product-1",
              productName: "Филе",
              quantity: 2,
              quantityAvailable: 10,
              available: true,
            },
          ],
          orderDraft: {
            orderedByFullName: "Иван Иванов",
            comments: "Доставить утром",
          },
        },
        completedOrder,
      ),
    ).toEqual({
      session,
      recentOrders: [completedOrder, previousOrder],
      cart: [],
      orderDraft: {
        orderedByFullName: "Мария Смирнова",
        comments: "",
      },
    });
  });
});

describe("writePersistedState", () => {
  test("stores only the compact snapshot without recent orders", () => {
    const session = {
      accessToken: "token",
      user: {
        userId: "user-1",
        accountType: "b2b_company",
        name: "Иван Иванов",
      },
    };
    const cart = [
      {
        productId: "product-1",
        productName: "Филе",
        imageUrl: "https://cdn.example.com/fish.png",
        categoryName: "Рыба",
        quantity: 2,
        quantityAvailable: 10,
        available: true,
      },
    ];
    const orderDraft = {
      orderedByFullName: "Иван Иванов",
      comments: "Доставить утром",
    };
    const writes = [];
    const storage = {
      setItem(key, value) {
        writes.push([key, JSON.parse(value)]);
      },
    };

    const persisted = writePersistedState(storage, {
      session,
      recentOrders: [makeOrder({ id: "order-99" })],
      cart,
      orderDraft,
    });

    expect(writes).toEqual([
      [
        "sm-b2b.state",
        {
          session,
          cart,
          orderDraft,
        },
      ],
    ]);
    expect(persisted).toEqual({
      session,
      cart,
      orderDraft,
    });
  });

  test("falls back to a lean cart snapshot when storage quota is exceeded", () => {
    const writes = [];
    const storage = {
      setItem(key, value) {
        const parsed = JSON.parse(value);
        writes.push([key, parsed]);

        if (writes.length === 1) {
          const error = new Error("quota exceeded");
          error.name = "QuotaExceededError";
          throw error;
        }
      },
    };

    const persisted = writePersistedState(storage, {
      session: null,
      recentOrders: [makeOrder({ id: "order-77" })],
      cart: [
        {
          productId: "product-1",
          productName: "Филе",
          imageUrl: "https://cdn.example.com/fish.png",
          categoryName: "Рыба",
          quantity: 2,
          quantityAvailable: 10,
          available: true,
        },
      ],
      orderDraft: {
        orderedByFullName: "Иван Иванов",
        comments: "Доставить утром",
      },
    });

    expect(writes).toEqual([
      [
        "sm-b2b.state",
        {
          session: null,
          cart: [
            {
              productId: "product-1",
              productName: "Филе",
              imageUrl: "https://cdn.example.com/fish.png",
              categoryName: "Рыба",
              quantity: 2,
              quantityAvailable: 10,
              available: true,
            },
          ],
          orderDraft: {
            orderedByFullName: "Иван Иванов",
            comments: "Доставить утром",
          },
        },
      ],
      [
        "sm-b2b.state",
        {
          session: null,
          cart: [
            {
              productId: "product-1",
              productName: "Филе",
              quantity: 2,
              quantityAvailable: 10,
              available: true,
            },
          ],
          orderDraft: {
            orderedByFullName: "Иван Иванов",
            comments: "Доставить утром",
          },
        },
      ],
    ]);
    expect(persisted).toEqual({
      session: null,
      cart: [
        {
          productId: "product-1",
          productName: "Филе",
          quantity: 2,
          quantityAvailable: 10,
          available: true,
        },
      ],
      orderDraft: {
        orderedByFullName: "Иван Иванов",
        comments: "Доставить утром",
      },
    });
  });
});
