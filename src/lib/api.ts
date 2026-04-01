import type { OrderAddress } from "@/lib/order-draft";
import type { ProductUnit } from "@/lib/product-units";

export type AccountType = "retail" | "b2b_company";

export type CurrentUser = {
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  username?: string;
  companyName?: string;
  address?: OrderAddress | null;
  accountType: AccountType;
};

export type AuthPayload = CurrentUser & {
  accessToken: string;
};

export type Category = {
  id: string;
  name: string;
  parentId?: string;
  image?: string | null;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  currency: string;
  unit: ProductUnit;
  description?: string;
  picture?: string;
  quantity: number;
  available: boolean;
  isB2bFeatured?: boolean;
  category?: Category;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartSnapshotItem = {
  productId: string;
  productName: string;
  unit: ProductUnit;
  imageUrl?: string;
  categoryName?: string;
  quantity: number;
  quantityAvailable: number;
  available: boolean;
};

export type CreateOrderPayload = {
  items: CartLine[];
  orderedByFullName: string;
  comments?: string;
  address?: OrderAddress;
};

export type UpdateOrderPayload = {
  items: CartLine[];
  orderedByFullName: string;
  comments?: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  price: number;
  imageUrl?: string;
};

export type Order = {
  id: string;
  userId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  orderedByFullName?: string | null;
  companyNameSnapshot?: string | null;
  price: number;
  currency: string;
  statusId: string;
  dateInsert: string;
  items: OrderItem[];
  comments?: string;
  address?: OrderAddress | null;
};

export type CartValidation = {
  valid: boolean;
  total?: number;
  error?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string | string[];
};

type CurrentUserPayload = Omit<CurrentUser, "userId"> & {
  userId?: string;
  id?: string;
};

const LOCAL_API_BASE_URL = "http://localhost:3001/api";
const PRODUCTION_API_BASE_URL = "https://land.smartforel.com/api";
const PUBLIC_API_PROXY_PATH = "/backend-api";
const PUBLIC_ASSET_PROXY_PATH = "/backend-assets";
const ALLOWED_ASSET_PROTOCOLS = new Set(["http:", "https:"]);
const LEGACY_PRODUCT_ASSET_PATTERN = /^\/?(?:static\/)?products\/([^/?#]+)$/i;

type ApiRuntimeOptions = {
  configuredApiBaseUrl?: string | null;
  browserHost?: string;
  browserOrigin?: string;
};

type RequestConfig = {
  allowAuthRefresh?: boolean;
};

const AUTH_REFRESH_EXCLUDED_PATHS = new Set([
  "auth/b2b/login",
  "auth/logout",
  "auth/refresh",
]);

type AccessTokenRefreshListener = (accessToken: string) => void;

let accessTokenRefreshListener: AccessTokenRefreshListener | null = null;
let inFlightAccessTokenRefresh: Promise<string> | null = null;

class ApiError extends Error {
  status?: number;
  payload?: unknown;

  constructor(message: string, options: { status?: number; payload?: unknown } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.payload = options.payload;
  }
}

function getBrowserLocation() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.location;
}

function isLocalBrowserHost(browserHost?: string) {
  return (
    !browserHost ||
    browserHost === "localhost" ||
    browserHost === "127.0.0.1" ||
    browserHost === "::1"
  );
}

export function resolveApiBaseUrl({
  configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
}: ApiRuntimeOptions = {}) {
  const normalizedApiBaseUrl = configuredApiBaseUrl?.trim();

  if (normalizedApiBaseUrl) {
    return normalizedApiBaseUrl;
  }

  return PUBLIC_API_PROXY_PATH;
}

function resolveDirectBackendOrigin({
  configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  browserHost = getBrowserLocation()?.hostname,
  browserOrigin = getBrowserLocation()?.origin,
}: ApiRuntimeOptions = {}) {
  const normalizedApiBaseUrl = configuredApiBaseUrl?.trim();

  if (normalizedApiBaseUrl) {
    try {
      return new URL(normalizedApiBaseUrl).origin;
    } catch {
      if (browserOrigin) {
        return new URL(normalizedApiBaseUrl, `${browserOrigin}/`).origin;
      }
    }
  }

  if (!isLocalBrowserHost(browserHost)) {
    return new URL(PRODUCTION_API_BASE_URL).origin;
  }

  return new URL(LOCAL_API_BASE_URL).origin;
}

function resolveAssetBaseUrl({
  configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
  browserHost = getBrowserLocation()?.hostname,
  browserOrigin = getBrowserLocation()?.origin,
}: ApiRuntimeOptions = {}) {
  if (!isLocalBrowserHost(browserHost)) {
    return PUBLIC_ASSET_PROXY_PATH;
  }

  const normalizedApiBaseUrl = configuredApiBaseUrl?.trim();

  if (normalizedApiBaseUrl) {
    try {
      return new URL(normalizedApiBaseUrl).origin;
    } catch {
      if (browserOrigin) {
        return new URL(normalizedApiBaseUrl, `${browserOrigin}/`).origin;
      }
    }
  }

  return PUBLIC_ASSET_PROXY_PATH;
}

function normalizeLegacyProductAssetPath(pathname: string) {
  const match = pathname.match(LEGACY_PRODUCT_ASSET_PATTERN);

  if (!match) {
    return undefined;
  }

  const baseName = decodeURIComponent(match[1]).replace(/\.[^.]+$/, "");
  return `/static/products/${baseName}.webp`;
}

function joinBaseUrl(baseUrl: string, path: string) {
  const normalizedPath = path.replace(/^\/+/, "");

  try {
    return new URL(normalizedPath, `${baseUrl.replace(/\/+$/, "")}/`).toString();
  } catch {
    return `${baseUrl.replace(/\/+$/, "")}/${normalizedPath}`;
  }
}

function toPublicAssetProxyPath(pathname: string, search = "", hash = "") {
  return joinBaseUrl(PUBLIC_ASSET_PROXY_PATH, pathname) + search + hash;
}

function resolveApiUrl(
  path: string,
  params?: URLSearchParams,
  options?: ApiRuntimeOptions,
) {
  const apiBaseUrl = resolveApiBaseUrl(options);
  const normalizedPath = path.replace(/^\/+/, "");
  const query = params?.toString();

  try {
    const url = new URL(normalizedPath, `${apiBaseUrl.replace(/\/+$/, "")}/`);
    if (query) {
      url.search = query;
    }
    return url.toString();
  } catch {
    const relativeUrl = `${apiBaseUrl.replace(/\/+$/, "")}/${normalizedPath}`;
    return query ? `${relativeUrl}?${query}` : relativeUrl;
  }
}

export function resolveAssetUrl(
  source?: string | null,
  options?: ApiRuntimeOptions,
) {
  const normalizedSource = normalizeAssetSource(source);

  if (!normalizedSource) {
    return undefined;
  }

  try {
    const absoluteUrl = new URL(normalizedSource);

    if (ALLOWED_ASSET_PROTOCOLS.has(absoluteUrl.protocol)) {
      if (
        !isLocalBrowserHost(options?.browserHost ?? getBrowserLocation()?.hostname)
        && absoluteUrl.origin === resolveDirectBackendOrigin(options)
      ) {
        return toPublicAssetProxyPath(
          absoluteUrl.pathname,
          absoluteUrl.search,
          absoluteUrl.hash,
        );
      }

      return absoluteUrl.toString();
    }

    return undefined;
  } catch {}

  try {
    return joinBaseUrl(resolveAssetBaseUrl(options), normalizedSource);
  } catch {
    return undefined;
  }
}

export function normalizeAssetSource(source?: string | null) {
  if (!source) {
    return undefined;
  }

  const trimmedSource = source.trim();

  if (!trimmedSource) {
    return undefined;
  }

  try {
    const absoluteUrl = new URL(trimmedSource);

    if (!ALLOWED_ASSET_PROTOCOLS.has(absoluteUrl.protocol)) {
      return undefined;
    }

    return normalizeLegacyProductAssetPath(absoluteUrl.pathname) ?? absoluteUrl.toString();
  } catch {}

  return normalizeLegacyProductAssetPath(trimmedSource) ?? trimmedSource;
}

function extractErrorMessage(payload: unknown, fallback: string, status?: number) {
  if (status === 429) {
    return "Слишком много запросов. Подождите минуту и попробуйте снова.";
  }
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const message = Reflect.get(payload, "message");
  if (Array.isArray(message)) {
    return message.join(", ");
  }
  if (typeof message === "string") {
    return message;
  }

  const error = Reflect.get(payload, "error");
  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

function createAuthHeaders(options: RequestInit, accessToken?: string) {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function executeRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
  params?: URLSearchParams,
) {
  const response = await fetch(resolveApiUrl(path, params), {
    ...options,
    headers: createAuthHeaders(options, accessToken),
    credentials: "include",
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

  if (!response.ok) {
    throw new ApiError(
      extractErrorMessage(payload, `Request failed with status ${response.status}`, response.status),
      {
        status: response.status,
        payload,
      },
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }

  return payload as T;
}

function shouldRefreshAccessToken(
  path: string,
  accessToken: string | undefined,
  error: unknown,
  config: RequestConfig,
) {
  return (
    Boolean(accessToken)
    && config.allowAuthRefresh !== false
    && !AUTH_REFRESH_EXCLUDED_PATHS.has(path.replace(/^\/+/, ""))
    && error instanceof ApiError
    && error.status === 401
  );
}

async function refreshAccessToken() {
  if (!inFlightAccessTokenRefresh) {
    inFlightAccessTokenRefresh = executeRequest<{ accessToken: string }>(
      "auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    )
      .then(({ accessToken }) => {
        accessTokenRefreshListener?.(accessToken);
        return accessToken;
      })
      .finally(() => {
        inFlightAccessTokenRefresh = null;
      });
  }

  return inFlightAccessTokenRefresh;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
  params?: URLSearchParams,
  config: RequestConfig = {},
) {
  try {
    return await executeRequest<T>(path, options, accessToken, params);
  } catch (error) {
    if (!shouldRefreshAccessToken(path, accessToken, error, config)) {
      throw error;
    }

    const refreshedAccessToken = await refreshAccessToken();
    return executeRequest<T>(path, options, refreshedAccessToken, params);
  }
}

export function subscribeAccessTokenRefresh(listener: AccessTokenRefreshListener) {
  accessTokenRefreshListener = listener;

  return () => {
    if (accessTokenRefreshListener === listener) {
      accessTokenRefreshListener = null;
    }
  };
}

function mapCurrentUser(payload: CurrentUserPayload): CurrentUser {
  return {
    userId: payload.userId ?? payload.id ?? "",
    email: payload.email,
    phone: payload.phone,
    name: payload.name,
    username: payload.username,
    companyName: payload.companyName,
    address: payload.address,
    accountType: payload.accountType,
  };
}

export function authPayloadToCurrentUser(payload: AuthPayload): CurrentUser {
  return mapCurrentUser(payload);
}

export async function loginB2B(credentials: {
  login: string;
  password: string;
}) {
  return request<AuthPayload>(
    "auth/b2b/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
  );
}

export async function getCurrentUser(accessToken: string) {
  return request<CurrentUserPayload>("auth/me", {}, accessToken).then(mapCurrentUser);
}

export async function logout(accessToken: string) {
  return request<{ message: string }>(
    "auth/logout",
    {
      method: "POST",
    },
    accessToken,
  );
}

export async function updateCurrentUser(
  accessToken: string,
  payload: {
    name?: string;
    phone?: string;
    address?: OrderAddress | null;
  },
) {
  return request<CurrentUserPayload>(
    "users/me",
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  ).then(mapCurrentUser);
}

export async function getProducts(filters: {
  search?: string;
  category?: string;
  availableOnly?: boolean;
  b2bFeaturedFirst?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.availableOnly) {
    params.set("available", "true");
  }
  if (filters.b2bFeaturedFirst) {
    params.set("b2bFeaturedFirst", "true");
  }
  return request<Product[]>("products", {}, undefined, params).then((products) => {
    return products.filter((product) => {
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const haystack = `${product.name} ${product.description ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      if (filters.category && product.category?.id !== filters.category) {
        return false;
      }
      if (filters.availableOnly && !product.available) {
        return false;
      }
      return true;
    });
  });
}

export async function getCategories() {
  return request<Category[]>("categories");
}

export async function validateCart(items: CartLine[]) {
  return request<CartValidation>("cart/validate", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function createOrder(payload: CreateOrderPayload, accessToken: string) {
  return request<Order>(
    "orders",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}

export async function getOrders(accessToken: string) {
  return request<Order[]>("orders", {}, accessToken);
}

export async function getOrderById(orderId: string, accessToken: string) {
  return request<Order>(`orders/${encodeURIComponent(orderId)}`, {}, accessToken);
}

export async function updateOrder(
  orderId: string,
  payload: UpdateOrderPayload,
  accessToken: string,
) {
  return request<Order>(
    `orders/${encodeURIComponent(orderId)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    accessToken,
  );
}
