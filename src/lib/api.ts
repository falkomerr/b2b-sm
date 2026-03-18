import type { OrderAddress } from "@/lib/order-draft";

export type AccountType = "retail" | "b2b_company";

export type CurrentUser = {
  userId: string;
  email?: string;
  phone?: string;
  name?: string;
  username?: string;
  companyName?: string;
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
  description?: string;
  picture?: string;
  quantity: number;
  available: boolean;
  category?: Category;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartSnapshotItem = {
  productId: string;
  productName: string;
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

export type OrderItem = {
  id: string;
  productId: string;
  productName: string;
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
const ALLOWED_ASSET_PROTOCOLS = new Set(["http:", "https:", "data:", "blob:"]);

function getBackendOrigin() {
  return new URL(API_BASE_URL).origin;
}

function resolveApiUrl(path: string, params?: URLSearchParams) {
  const url = new URL(path, `${API_BASE_URL}/`);
  if (params) {
    url.search = params.toString();
  }
  return url.toString();
}

export function resolveAssetUrl(source?: string | null) {
  if (!source) {
    return undefined;
  }

  const normalizedSource = source.trim();

  if (!normalizedSource) {
    return undefined;
  }

  try {
    const absoluteUrl = new URL(normalizedSource);

    if (ALLOWED_ASSET_PROTOCOLS.has(absoluteUrl.protocol)) {
      return absoluteUrl.toString();
    }

    return undefined;
  } catch {}

  try {
    return new URL(normalizedSource, `${getBackendOrigin()}/`).toString();
  } catch {
    return undefined;
  }
}

function extractErrorMessage(payload: unknown, fallback: string) {
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

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
) {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as ApiEnvelope<T>) : null;

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, `Request failed with status ${response.status}`),
    );
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data;
  }

  return payload as T;
}

function mapCurrentUser(payload: CurrentUserPayload): CurrentUser {
  return {
    userId: payload.userId ?? payload.id ?? "",
    email: payload.email,
    phone: payload.phone,
    name: payload.name,
    username: payload.username,
    companyName: payload.companyName,
    accountType: payload.accountType,
  };
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
  return request<Product[]>("products", {}, undefined).then((products) => {
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
