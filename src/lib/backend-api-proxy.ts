import {
  ORDER_ACCEPTANCE_CLOSED_MESSAGE,
  isOrderAcceptanceOpen,
} from "@/lib/order-acceptance-window";

const BACKEND_API_ORIGIN = "https://land.smartforel.com";

const REQUEST_HEADERS_TO_DROP = new Set([
  "accept-encoding",
  "connection",
  "content-length",
  "host",
  "origin",
  "referer",
]);

const RESPONSE_HEADERS_TO_DROP = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

const REFRESH_COOKIE_NAME = "refreshToken=";

function shouldForwardRefreshTokenCookie(path: string[] | undefined) {
  if (!path?.length) {
    return false;
  }

  const normalizedPath = path.join("/");
  return (
    normalizedPath === "auth/b2b/login"
    || normalizedPath === "auth/refresh"
    || normalizedPath === "auth/logout"
  );
}

function getSetCookieValues(source: Headers) {
  const getSetCookie = Reflect.get(source, "getSetCookie");

  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(source);

    if (Array.isArray(values) && values.length > 0) {
      return values;
    }
  }

  const value = source.get("set-cookie");
  return value ? [value] : [];
}

export function buildBackendApiUrl(path: string[] | undefined, requestUrl: string) {
  const upstreamUrl = new URL("/api/", BACKEND_API_ORIGIN);
  const pathname = (path ?? []).map(encodeURIComponent).join("/");

  if (pathname) {
    upstreamUrl.pathname = `/api/${pathname}`;
  }

  upstreamUrl.search = new URL(requestUrl).search;
  return upstreamUrl;
}

export function createBackendApiRequestHeaders(source: Headers) {
  const headers = new Headers();

  source.forEach((value, key) => {
    if (REQUEST_HEADERS_TO_DROP.has(key.toLowerCase())) {
      return;
    }

    headers.set(key, value);
  });

  headers.set("accept-encoding", "identity");
  return headers;
}

export function createBackendApiResponseHeaders(
  source: Headers,
  path?: string[],
) {
  const headers = new Headers();

  source.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();

    if (normalizedKey === "set-cookie") {
      return;
    }

    if (RESPONSE_HEADERS_TO_DROP.has(normalizedKey)) {
      return;
    }

    headers.set(key, value);
  });

  if (shouldForwardRefreshTokenCookie(path)) {
    for (const value of getSetCookieValues(source)) {
      if (value.startsWith(REFRESH_COOKIE_NAME)) {
        headers.append("set-cookie", value);
      }
    }
  }

  return headers;
}

export function createOrderAcceptanceGuardResponse(
  method: string,
  path: string[] | undefined,
  now = new Date(),
) {
  if (method.toUpperCase() !== "POST" || path?.length !== 1 || path[0] !== "orders") {
    return undefined;
  }

  if (isOrderAcceptanceOpen(now)) {
    return undefined;
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: ORDER_ACCEPTANCE_CLOSED_MESSAGE,
    }),
    {
      status: 403,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    },
  );
}
