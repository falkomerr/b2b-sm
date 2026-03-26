import { describe, expect, test } from "bun:test";
import {
  SESSION_EXPIRED_NOTICE_KEY,
  SESSION_TTL_MS,
  createClearedPersistedState,
  createCompletedOrderPersistedState,
  createExpiredPersistedState,
  createSessionState,
  consumeSessionExpiredNotice,
  isSessionExpired,
  normalizePersistedState,
  replaceSessionUser,
  resolveOrderedByFullName,
  restorePersistedState,
  writePersistedState,
} from "./app-store.tsx";

const NOW = Date.parse("2026-03-24T12:00:00.000Z");

function makeUser(overrides = {}) {
  return {
    userId: "user-1",
    accountType: "b2b_company",
    name: "Иван Иванов",
    ...overrides,
  };
}

function makeSession(overrides = {}) {
  return {
    accessToken: "token",
    expiresAt: NOW + SESSION_TTL_MS,
    user: makeUser(),
    ...overrides,
  };
}

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
        unit: "piece",
        quantity: 2,
        price: 0,
      },
    ],
    ...overrides,
  };
}

describe("createClearedPersistedState", () => {
  test("clears cart items and comment while preserving session and buyer name", () => {
    const session = makeSession();

    expect(
      createClearedPersistedState({
        session,
        recentOrders: [makeOrder()],
        cart: [
          {
            productId: "product-1",
            productName: "Филе",
            unit: "piece",
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
    const session = makeSession();
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
              unit: "piece",
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

describe("session ttl helpers", () => {
  test("creates a session that expires exactly in one week", () => {
    const session = createSessionState("token", makeUser(), NOW);

    expect(session).toEqual({
      accessToken: "token",
      expiresAt: NOW + SESSION_TTL_MS,
      user: makeUser(),
    });
  });

  test("preserves expiry when replacing the current user", () => {
    const session = makeSession();

    expect(
      replaceSessionUser(session, makeUser({ name: "Мария Смирнова" })),
    ).toEqual({
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      user: makeUser({ name: "Мария Смирнова" }),
    });
  });

  test("treats missing expiry as an expired legacy session", () => {
    expect(isSessionExpired({ accessToken: "token", user: makeUser() }, NOW)).toBe(true);
  });

  test("expires past sessions and keeps future sessions active", () => {
    expect(isSessionExpired(makeSession({ expiresAt: NOW - 1 }), NOW)).toBe(true);
    expect(isSessionExpired(makeSession({ expiresAt: NOW + 1 }), NOW)).toBe(false);
  });
});

describe("resolveOrderedByFullName", () => {
  test("does not prefill buyer name when profile name matches company name", () => {
    expect(
      resolveOrderedByFullName(
        "",
        makeUser({
          name: "Smartfish",
          companyName: "Smartfish",
        }),
      ),
    ).toBe("");
  });

  test("keeps an explicitly entered buyer name", () => {
    expect(
      resolveOrderedByFullName(
        "Иван Иванов",
        makeUser({
          name: "Smartfish",
          companyName: "Smartfish",
        }),
      ),
    ).toBe("Иван Иванов");
  });
});

describe("createExpiredPersistedState", () => {
  test("drops session and recent orders while keeping cart and draft", () => {
    expect(
      createExpiredPersistedState({
        session: makeSession(),
        recentOrders: [makeOrder()],
        cart: [
          {
            productId: "product-1",
            productName: "Филе",
            unit: "piece",
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
      session: null,
      recentOrders: [],
      cart: [
        {
          productId: "product-1",
          productName: "Филе",
          unit: "piece",
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

describe("writePersistedState", () => {
  test("stores only the compact snapshot without recent orders", () => {
    const session = makeSession();
    const cart = [
      {
        productId: "product-1",
        productName: "Филе",
        unit: "piece",
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
          unit: "kg",
          imageUrl: "https://cdn.example.com/fish.png",
          categoryName: "Рыба",
          quantity: 0.25,
          quantityAvailable: 3.75,
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
              unit: "kg",
              imageUrl: "https://cdn.example.com/fish.png",
              categoryName: "Рыба",
              quantity: 0.25,
              quantityAvailable: 3.75,
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
              unit: "kg",
              quantity: 0.25,
              quantityAvailable: 3.75,
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
          unit: "kg",
          quantity: 0.25,
          quantityAvailable: 3.75,
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

describe("normalizePersistedState", () => {
  test("normalizes legacy cart image urls when restoring persisted state", () => {
    const persisted = normalizePersistedState({
      session: null,
      cart: [
        {
          productId: "product-1",
          productName: "Филе",
          unit: "kg",
          imageUrl: "/products/IMG_0327.JPG",
          quantity: 2,
          quantityAvailable: 10,
          available: true,
        },
      ],
      orderDraft: {
        orderedByFullName: "Иван Иванов",
        comments: "",
      },
    });

    expect(persisted).toEqual({
      session: null,
      cart: [
        {
          productId: "product-1",
          productName: "Филе",
          unit: "kg",
          imageUrl: "/static/products/IMG_0327.webp",
          quantity: 2,
          quantityAvailable: 10,
          available: true,
        },
      ],
      orderDraft: {
        orderedByFullName: "Иван Иванов",
        comments: "",
      },
    });
  });
});

describe("restorePersistedState", () => {
  test("keeps a valid session with a future expiry", () => {
    const session = makeSession({ expiresAt: NOW + 1 });

    expect(
      restorePersistedState(
        {
          session,
          recentOrders: [makeOrder()],
          cart: [],
          orderDraft: {
            orderedByFullName: "Иван Иванов",
            comments: "",
          },
        },
        NOW,
      ),
    ).toEqual({
      expired: false,
      state: {
        session,
        recentOrders: [makeOrder()],
        cart: [],
        orderDraft: {
          orderedByFullName: "Иван Иванов",
          comments: "",
        },
      },
    });
  });

  test("clears legacy session without expiry while preserving cart and draft", () => {
    expect(
      restorePersistedState(
        {
          session: {
            accessToken: "token",
            user: makeUser(),
          },
          recentOrders: [makeOrder()],
          cart: [
            {
              productId: "product-1",
              productName: "Филе",
              unit: "piece",
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
        NOW,
      ),
    ).toEqual({
      expired: true,
      state: {
        session: null,
        recentOrders: [],
        cart: [
          {
            productId: "product-1",
            productName: "Филе",
            unit: "piece",
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
    });
  });
});

describe("consumeSessionExpiredNotice", () => {
  test("returns true once and removes the notice flag", () => {
    const storage = {
      value: "1",
      getItem(key) {
        return key === SESSION_EXPIRED_NOTICE_KEY ? this.value : null;
      },
      removeItem(key) {
        if (key === SESSION_EXPIRED_NOTICE_KEY) {
          this.value = null;
        }
      },
    };

    expect(consumeSessionExpiredNotice(storage)).toBe(true);
    expect(consumeSessionExpiredNotice(storage)).toBe(false);
  });
});
