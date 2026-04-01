import { afterEach, describe, expect, test } from "bun:test";
import { GET, POST } from "@/app/backend-api/[...path]/route";
import { ORDER_ACCEPTANCE_CLOSED_MESSAGE } from "@/lib/order-acceptance-window";

import {
  buildBackendApiUrl,
  createBackendApiRequestHeaders,
  createBackendApiResponseHeaders,
} from "@/lib/backend-api-proxy";

const RealDate = Date;
const realFetch = globalThis.fetch;

function freezeTime(isoString) {
  globalThis.Date = class MockDate extends RealDate {
    constructor(value) {
      super(value ?? isoString);
    }

    static now() {
      return new RealDate(isoString).valueOf();
    }

    static parse(value) {
      return RealDate.parse(value);
    }

    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  };
}

afterEach(() => {
  globalThis.Date = RealDate;
  globalThis.fetch = realFetch;
});

describe("backend api proxy helpers", () => {
  test("builds upstream api url with preserved query string", () => {
    const url = buildBackendApiUrl(
      ["auth", "me"],
      "https://b2b.smartforel.com/backend-api/auth/me?foo=bar&baz=1",
    );

    expect(url.toString()).toBe("https://land.smartforel.com/api/auth/me?foo=bar&baz=1");
  });

  test("sanitizes request headers before proxying upstream", () => {
    const headers = createBackendApiRequestHeaders(
      new Headers({
        Accept: "application/json",
        Authorization: "Bearer token",
        Connection: "keep-alive",
        "Content-Length": "123",
        Host: "b2b.smartforel.com",
        Origin: "https://b2b.smartforel.com",
        Referer: "https://b2b.smartforel.com/login",
      }),
    );

    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer token");
    expect(headers.get("accept-encoding")).toBe("identity");
    expect(headers.has("connection")).toBe(false);
    expect(headers.has("content-length")).toBe(false);
    expect(headers.has("host")).toBe(false);
    expect(headers.has("origin")).toBe(false);
    expect(headers.has("referer")).toBe(false);
  });

  test("drops hop-by-hop response headers before returning to the browser", () => {
    const headers = createBackendApiResponseHeaders(
      new Headers({
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked, chunked",
        Connection: "close",
        "Content-Encoding": "gzip",
        ETag: 'W/"123"',
      }),
    );

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("etag")).toBe('W/"123"');
    expect(headers.has("transfer-encoding")).toBe(false);
    expect(headers.has("connection")).toBe(false);
    expect(headers.has("content-encoding")).toBe(false);
  });

  test("drops upstream set-cookie headers that break the Next.js route proxy", () => {
    const headers = createBackendApiResponseHeaders(
      new Headers({
        "Content-Type": "application/json",
        "Set-Cookie":
          "refreshToken=test-token; Max-Age=604800; Path=/; Expires=Fri, 27 Mar 2026 20:13:45 GMT; HttpOnly; SameSite=Strict",
      }),
    );

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.has("set-cookie")).toBe(false);
  });

  test("forwards refreshToken cookie for auth refresh responses", () => {
    const headers = createBackendApiResponseHeaders(
      new Headers({
        "Content-Type": "application/json",
        "Set-Cookie":
          "refreshToken=test-token; Max-Age=604800; Path=/; Expires=Fri, 27 Mar 2026 20:13:45 GMT; HttpOnly; SameSite=Strict",
      }),
      ["auth", "refresh"],
    );

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("set-cookie")).toContain("refreshToken=test-token");
    expect(headers.get("set-cookie")).toContain("Max-Age=604800");
  });

  test("forwards cleared refreshToken cookie for logout responses", () => {
    const headers = createBackendApiResponseHeaders(
      new Headers({
        "Content-Type": "application/json",
        "Set-Cookie":
          "refreshToken=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict",
      }),
      ["auth", "logout"],
    );

    expect(headers.get("set-cookie")).toContain("refreshToken=");
    expect(headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

describe("backend api proxy route", () => {
  test("proxies auth session reads through the same-origin backend-api route", async () => {
    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized",
          statusCode: 401,
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "set-cookie":
              "refreshToken=test-token; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict",
          },
        },
      );
    };

    const response = await GET(
      new Request("https://b2b.smartforel.com/backend-api/auth/me?foo=bar", {
        method: "GET",
        headers: {
          authorization: "Bearer token",
        },
      }),
      {
        params: Promise.resolve({ path: ["auth", "me"] }),
      },
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0][0].toString()).toBe("https://land.smartforel.com/api/auth/me?foo=bar");
    expect(fetchCalls[0][1]).toMatchObject({
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
    expect(fetchCalls[0][1].headers.get("authorization")).toBe("Bearer token");
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(await response.json()).toEqual({
      success: false,
      message: "Unauthorized",
      statusCode: 401,
    });
  });

  test("keeps refreshToken set-cookie header for auth refresh responses", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: "fresh-token",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "set-cookie":
              "refreshToken=test-token; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict",
          },
        },
      );

    const response = await POST(
      new Request("https://b2b.smartforel.com/backend-api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
          "content-type": "application/json",
        },
      }),
      {
        params: Promise.resolve({ path: ["auth", "refresh"] }),
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("refreshToken=test-token");
    expect(await response.json()).toEqual({
      success: true,
      data: {
        accessToken: "fresh-token",
      },
    });
  });
});

describe("backend api proxy order acceptance guard", () => {
  test("blocks order creation outside the Bishkek acceptance window before upstream fetch", async () => {
    freezeTime("2026-03-09T23:59:00.000Z");

    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(null, { status: 204 });
    };

    const response = await POST(
      new Request("https://b2b.smartforel.com/backend-api/orders", {
        method: "POST",
        body: JSON.stringify({ items: [] }),
        headers: {
          "content-type": "application/json",
        },
      }),
      {
        params: Promise.resolve({ path: ["orders"] }),
      },
    );

    expect(fetchCalled).toBe(false);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      message: ORDER_ACCEPTANCE_CLOSED_MESSAGE,
    });
  });

  test("proxies order creation at 06:00 Bishkek time", async () => {
    freezeTime("2026-03-10T00:00:00.000Z");

    const fetchCalls = [];
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args);
      return new Response(JSON.stringify({ success: true, data: { id: "order-1" } }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      });
    };

    const response = await POST(
      new Request("https://b2b.smartforel.com/backend-api/orders", {
        method: "POST",
        body: JSON.stringify({ items: [] }),
        headers: {
          authorization: "Bearer token",
          "content-type": "application/json",
        },
      }),
      {
        params: Promise.resolve({ path: ["orders"] }),
      },
    );

    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0][0].toString()).toBe("https://land.smartforel.com/api/orders");
    expect(fetchCalls[0][1]).toMatchObject({
      method: "POST",
      redirect: "manual",
      cache: "no-store",
    });
    expect(response.status).toBe(201);
  });

  test("does not apply the time guard to non-order routes", async () => {
    freezeTime("2026-03-09T23:59:00.000Z");

    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ success: true, data: { valid: true } }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    };

    const response = await POST(
      new Request("https://b2b.smartforel.com/backend-api/cart/validate", {
        method: "POST",
        body: JSON.stringify({ items: [] }),
        headers: {
          "content-type": "application/json",
        },
      }),
      {
        params: Promise.resolve({ path: ["cart", "validate"] }),
      },
    );

    expect(fetchCalled).toBe(true);
    expect(response.status).toBe(200);
  });

  test("does not apply the time guard to order reads", async () => {
    freezeTime("2026-03-09T23:59:00.000Z");

    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      });
    };

    const response = await GET(
      new Request("https://b2b.smartforel.com/backend-api/orders", {
        method: "GET",
      }),
      {
        params: Promise.resolve({ path: ["orders"] }),
      },
    );

    expect(fetchCalled).toBe(true);
    expect(response.status).toBe(200);
  });
});
