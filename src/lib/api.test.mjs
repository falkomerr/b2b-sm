import { afterEach, describe, expect, test } from "bun:test";
import {
  getOrderById,
  getProducts,
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
  test("keeps data URLs unchanged", () => {
    expect(resolveAssetUrl(DATA_URL)).toBe(DATA_URL);
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
});

describe("resolveApiBaseUrl", () => {
  test("uses same-origin proxy on localhost", () => {
    expect(resolveApiBaseUrl({ browserHost: "localhost" })).toBe("/backend-api");
    expect(resolveApiBaseUrl({ browserHost: "127.0.0.1" })).toBe("/backend-api");
  });

  test("uses same-origin proxy on public hosts", () => {
    expect(resolveApiBaseUrl({ browserHost: "b2b.smartforel.com" })).toBe(
      "/backend-api",
    );
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
