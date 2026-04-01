import { afterEach, describe, expect, test } from "bun:test";
import { GET } from "@/app/backend-api/[...path]/route";

import {
  buildBackendApiUrl,
  createBackendApiRequestHeaders,
  createBackendApiResponseHeaders,
} from "@/lib/backend-api-proxy";

const realFetch = globalThis.fetch;

afterEach(() => {
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
});
