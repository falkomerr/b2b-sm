import { describe, expect, test } from "bun:test";

import {
  buildBackendApiUrl,
  createBackendApiRequestHeaders,
  createBackendApiResponseHeaders,
} from "@/lib/backend-api-proxy";

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
      }),
    );

    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe("Bearer token");
    expect(headers.get("accept-encoding")).toBe("identity");
    expect(headers.has("connection")).toBe(false);
    expect(headers.has("content-length")).toBe(false);
    expect(headers.has("host")).toBe(false);
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
});
