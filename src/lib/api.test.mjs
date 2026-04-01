import { afterEach, describe, expect, test } from "bun:test";
import {
  authPayloadToCurrentUser,
  getCurrentUser,
  getOrderById,
  getProducts,
  loginB2B,
  normalizeAssetSource,
  resolveApiBaseUrl,
  resolveAssetUrl,
  updateOrder,
} from "./api.ts";

const DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlH0W8AAAAASUVORK5CYII=";
const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("resolveAssetUrl", () => {
  test("drops inline data URLs", () => {
    expect(resolveAssetUrl(DATA_URL)).toBeUndefined();
  });

  test("drops blob URLs", () => {
    expect(resolveAssetUrl("blob:https://b2b.smartforel.com/product-image")).toBeUndefined();
  });

  test("resolves relative asset paths through same-origin asset proxy by default", () => {
    expect(resolveAssetUrl("/products/item.jpg")).toBe(
      "/backend-assets/static/products/item.webp",
    );
    expect(resolveAssetUrl("products/item.jpg")).toBe(
      "/backend-assets/static/products/item.webp",
    );
  });

  test("returns undefined for blank values", () => {
    expect(resolveAssetUrl("   ")).toBeUndefined();
    expect(resolveAssetUrl(null)).toBeUndefined();
    expect(resolveAssetUrl(undefined)).toBeUndefined();
  });
});

describe("normalizeAssetSource", () => {
  test("normalizes legacy product asset paths to static webp", () => {
    expect(normalizeAssetSource("/products/item.jpg")).toBe("/static/products/item.webp");
    expect(normalizeAssetSource("https://land.smartforel.com/products/item.JPG")).toBe(
      "/static/products/item.webp",
    );
  });

  test("drops inline and blob asset sources", () => {
    expect(normalizeAssetSource(DATA_URL)).toBeUndefined();
    expect(normalizeAssetSource("blob:https://b2b.smartforel.com/product-image")).toBeUndefined();
  });
});

describe("resolveApiBaseUrl", () => {
  test("uses same-origin proxy on localhost", () => {
    expect(resolveApiBaseUrl({ browserHost: "localhost" })).toBe("/backend-api");
    expect(resolveApiBaseUrl({ browserHost: "127.0.0.1" })).toBe("/backend-api");
  });

  test("uses same-origin proxy on public hosts", () => {
    expect(resolveApiBaseUrl({ browserHost: "b2b.smartforel.com" })).toBe("/backend-api");
  });

  test("prefers explicit api base URL", () => {
    expect(
      resolveApiBaseUrl({
        browserHost: "localhost",
        configuredApiBaseUrl: "https://api.example.com/v1",
      }),
    ).toBe("https://api.example.com/v1");
  });
});

describe("resolveAssetUrl on public hosts", () => {
  test("resolves relative asset paths through same-origin asset proxy", () => {
    expect(
      resolveAssetUrl("/products/item.jpg", {
        browserHost: "b2b.smartforel.com",
      }),
    ).toBe("/backend-assets/static/products/item.webp");
  });

  test("proxies absolute backend asset URLs on public hosts", () => {
    expect(
      resolveAssetUrl("https://land.smartforel.com/products/item.jpg", {
        browserHost: "b2b.smartforel.com",
      }),
    ).toBe("/backend-assets/static/products/item.webp");
  });
});

describe("getProducts", () => {
  test("forwards catalog filters to query string including B2B featured mode", async () => {
    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    };

    await getProducts({
      search: "форель",
      category: "cat-1",
      availableOnly: true,
      b2bFeaturedFirst: true,
    });

    expect(fetchCalls).toHaveLength(1);
    const url = new URL(fetchCalls[0][0].toString(), "https://b2b.smartforel.com");

    expect(url.pathname).toBe("/backend-api/products");
    expect(url.searchParams.get("search")).toBe("форель");
    expect(url.searchParams.get("category")).toBe("cat-1");
    expect(url.searchParams.get("available")).toBe("true");
    expect(url.searchParams.get("b2bFeaturedFirst")).toBe("true");
  });
});

describe("authPayloadToCurrentUser", () => {
  test("maps b2b login response into the session user shape", () => {
    expect(
      authPayloadToCurrentUser({
        accessToken: "token",
        userId: "user-42",
        username: "acme",
        email: "buyer@example.com",
        companyName: "Acme LLC",
        accountType: "b2b_company",
        name: "Иван Иванов",
        phone: "+996700000000",
        address: {
          settlement: "Бишкек",
          street: "Логвиненко",
          house: "55",
          apartment: "12",
          entrance: "2",
          floor: "3",
          comment: "Офис",
        },
      }),
    ).toEqual({
      userId: "user-42",
      username: "acme",
      email: "buyer@example.com",
      companyName: "Acme LLC",
      accountType: "b2b_company",
      name: "Иван Иванов",
      phone: "+996700000000",
      address: {
        settlement: "Бишкек",
        street: "Логвиненко",
        house: "55",
        apartment: "12",
        entrance: "2",
        floor: "3",
        comment: "Офис",
      },
    });
  });
});

describe("loginB2B", () => {
  test("maps throttling responses to a user-friendly message", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          success: false,
          message: "ThrottlerException: Too Many Requests",
          statusCode: 429,
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
          },
        },
      );

    await expect(
      loginB2B({
        login: "acme",
        password: "secret",
      }),
    ).rejects.toThrow("Слишком много запросов. Подождите минуту и попробуйте снова.");
  });
});

describe("auth refresh flow", () => {
  test("refreshes auth/me once after a 401 and retries with the new access token", async () => {
    const fetchCalls = [];

    globalThis.fetch = async (url, options = {}) => {
      fetchCalls.push([url, options]);
      const pathname = new URL(url, "https://b2b.smartforel.com").pathname;
      const authorization = options?.headers?.get?.("Authorization");

      if (pathname === "/backend-api/auth/me" && authorization === "Bearer expired-token") {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Unauthorized",
            statusCode: 401,
          }),
          {
            status: 401,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      if (pathname === "/backend-api/auth/refresh") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "fresh-token",
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      if (pathname === "/backend-api/auth/me" && authorization === "Bearer fresh-token") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              userId: "user-42",
              username: "acme",
              accountType: "b2b_company",
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      throw new Error(`Unexpected fetch call: ${pathname} ${authorization ?? ""}`);
    };

    await expect(getCurrentUser("expired-token")).resolves.toEqual({
      userId: "user-42",
      username: "acme",
      accountType: "b2b_company",
    });

    expect(fetchCalls).toHaveLength(3);
    expect(
      fetchCalls.map(([url]) => new URL(url, "https://b2b.smartforel.com").pathname),
    ).toEqual([
      "/backend-api/auth/me",
      "/backend-api/auth/refresh",
      "/backend-api/auth/me",
    ]);
    expect(fetchCalls[1][1]).toMatchObject({
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
    expect(fetchCalls[2][1].headers.get("Authorization")).toBe("Bearer fresh-token");
  });

  test("retries a protected request only once after refresh", async () => {
    const fetchCalls = [];

    globalThis.fetch = async (url, options = {}) => {
      fetchCalls.push([url, options]);
      const pathname = new URL(url, "https://b2b.smartforel.com").pathname;

      if (pathname === "/backend-api/auth/refresh") {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "fresh-token",
            },
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized",
          statusCode: 401,
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    await expect(getOrderById("order-42", "expired-token")).rejects.toThrow("Unauthorized");

    expect(
      fetchCalls.map(([url]) => new URL(url, "https://b2b.smartforel.com").pathname),
    ).toEqual([
      "/backend-api/orders/order-42",
      "/backend-api/auth/refresh",
      "/backend-api/orders/order-42",
    ]);
  });
});

describe("order api helpers", () => {
  test("loads a single order by id", async () => {
    globalThis.fetch = async (url, options) => {
      expect(url).toBe("/backend-api/orders/order-42");
      expect(options?.method).toBeUndefined();
      expect(options?.headers?.get("Authorization")).toBe("Bearer token");

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "order-42",
            price: 0,
            currency: "KGS",
            statusId: "N",
            dateInsert: "2026-03-20T00:00:00.000Z",
            items: [],
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    await expect(getOrderById("order-42", "token")).resolves.toEqual(
      expect.objectContaining({
        id: "order-42",
        statusId: "N",
      }),
    );
  });

  test("updates an order with put payload", async () => {
    globalThis.fetch = async (url, options) => {
      expect(url).toBe("/backend-api/orders/order-42");
      expect(options?.method).toBe("PUT");
      expect(options?.headers?.get("Authorization")).toBe("Bearer token");
      expect(JSON.parse(String(options?.body))).toEqual({
        items: [{ productId: "product-1", quantity: 2 }],
        orderedByFullName: "Иван Иванов",
        comments: "Без звонка",
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "order-42",
            price: 0,
            currency: "KGS",
            statusId: "P",
            dateInsert: "2026-03-20T00:00:00.000Z",
            items: [],
            comments: "Без звонка",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    };

    await expect(
      updateOrder(
        "order-42",
        {
          items: [{ productId: "product-1", quantity: 2 }],
          orderedByFullName: "Иван Иванов",
          comments: "Без звонка",
        },
        "token",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        id: "order-42",
        statusId: "P",
        comments: "Без звонка",
      }),
    );
  });
});
