"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type AuthPayload,
  type CartSnapshotItem,
  type CurrentUser,
  type Order,
  type Product,
  getCurrentUser,
  loginB2B as loginB2BRequest,
  logout as logoutRequest,
  normalizeAssetSource,
  updateCurrentUser as updateCurrentUserRequest,
} from "@/lib/api";
import {
  createOrderAddressDraft,
  toOrderAddressPayload,
  type OrderAddressDraft,
} from "@/lib/order-draft";
import {
  decrementQuantity,
  getInitialQuantityForUnit,
  incrementQuantity,
  normalizeQuantity,
} from "@/lib/product-units";

type OrderDraft = {
  orderedByFullName: string;
  comments: string;
  address?: OrderAddressDraft;
};

type SessionState = {
  accessToken: string;
  user: CurrentUser;
};

type AppStoreValue = {
  hydrated: boolean;
  session: SessionState | null;
  cart: CartSnapshotItem[];
  recentOrders: Order[];
  orderDraft: OrderDraft;
  cartCount: number;
  login: (credentials: { login: string; password: string }) => Promise<AuthPayload>;
  logout: () => Promise<void>;
  addProduct: (product: Product) => void;
  decrementProduct: (productId: string) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  replaceCartFromOrder: (order: Order) => void;
  rememberOrder: (order: Order) => void;
  completeOrder: (order: Order) => void;
  clearCart: () => void;
  updateDraft: (patch: Partial<OrderDraft>) => void;
  saveProfile: (patch: {
    name?: string;
    phone?: string;
    address?: OrderAddressDraft | null;
  }) => Promise<CurrentUser>;
};

type StoreSnapshot = {
  session: SessionState | null;
  recentOrders: Order[];
  cart: CartSnapshotItem[];
  orderDraft: OrderDraft;
};

type PersistedState = {
  session: SessionState | null;
  recentOrders?: Order[];
  cart: CartSnapshotItem[];
  orderDraft: OrderDraft;
};

type CompactPersistedState = Omit<PersistedState, "recentOrders">;

const STORAGE_KEY = "sm-b2b.state";
const RECENT_ORDERS_LIMIT = 10;

const defaultDraft: OrderDraft = {
  orderedByFullName: "",
  comments: "",
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

function clampQuantity(quantity: number, max: number) {
  return Math.max(0, Math.min(quantity, max));
}

function normalizeCartSnapshotItem(item: CartSnapshotItem): CartSnapshotItem {
  return {
    ...item,
    unit: item.unit ?? "piece",
    imageUrl: normalizeAssetSource(item.imageUrl),
  };
}

export function normalizePersistedState(persisted: PersistedState): PersistedState {
  return {
    session: persisted.session,
    ...(persisted.recentOrders
        ? {
          recentOrders: persisted.recentOrders.map((order) => ({
            ...order,
            items: order.items.map((item) => ({
              ...item,
              unit: item.unit ?? "piece",
              imageUrl: normalizeAssetSource(item.imageUrl),
            })),
          })),
        }
      : {}),
    cart: (persisted.cart ?? []).map(normalizeCartSnapshotItem),
    orderDraft: persisted.orderDraft,
  };
}

function readPersistedState(): PersistedState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return normalizePersistedState(JSON.parse(raw) as PersistedState);
  } catch {
    return null;
  }
}

function createCompactPersistedState(snapshot: StoreSnapshot): CompactPersistedState {
  return {
    session: snapshot.session,
    cart: snapshot.cart,
    orderDraft: snapshot.orderDraft,
  };
}

function createLeanCartPersistedState(snapshot: StoreSnapshot): CompactPersistedState {
  return {
    session: snapshot.session,
    cart: snapshot.cart.map(
      ({ productId, productName, quantity, quantityAvailable, available, unit }) => ({
        unit,
        productId,
        productName,
        quantity,
        quantityAvailable,
        available,
      }),
    ),
    orderDraft: snapshot.orderDraft,
  };
}

function isQuotaExceededError(error: unknown): error is Error {
  return error instanceof Error && error.name === "QuotaExceededError";
}

export function writePersistedState(
  storage: Pick<Storage, "setItem">,
  snapshot: StoreSnapshot,
) {
  const candidates: CompactPersistedState[] = [
    createCompactPersistedState(snapshot),
    createLeanCartPersistedState(snapshot),
    {
      session: snapshot.session,
      cart: [],
      orderDraft: snapshot.orderDraft,
    },
  ];

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(candidate));
      return candidate;
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  if (lastError) {
    console.warn("Failed to persist app state due to storage quota.", lastError);
  }

  return null;
}

function persistState(snapshot: StoreSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    writePersistedState(window.localStorage, snapshot);
  } catch (error) {
    console.warn("Failed to persist app state.", error);
  }
}

export function mergeRecentOrders(current: Order[], nextOrder: Order) {
  return [
    nextOrder,
    ...current.filter((order) => order.id !== nextOrder.id),
  ].slice(0, RECENT_ORDERS_LIMIT);
}

export function createClearedPersistedState(
  snapshot: StoreSnapshot,
): StoreSnapshot {
  return {
    ...snapshot,
    cart: [],
    orderDraft: {
      ...snapshot.orderDraft,
      comments: "",
    },
  };
}

export function createCompletedOrderPersistedState(
  snapshot: StoreSnapshot,
  order: Order,
): StoreSnapshot {
  return {
    ...snapshot,
    recentOrders: mergeRecentOrders(snapshot.recentOrders ?? [], order),
    cart: [],
    orderDraft: {
      ...snapshot.orderDraft,
      orderedByFullName:
        order.orderedByFullName ?? snapshot.orderDraft.orderedByFullName,
      comments: "",
    },
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartSnapshotItem[]>([]);
  const [orderDraft, setOrderDraft] = useState<OrderDraft>(defaultDraft);

  useEffect(() => {
    const persisted = readPersistedState();

    if (persisted) {
      setSession(persisted.session);
      setRecentOrders(persisted.recentOrders ?? []);
      setCart(persisted.cart ?? []);
      setOrderDraft({
        ...defaultDraft,
        ...(persisted.orderDraft ?? {}),
      });

      if (persisted.session?.accessToken) {
        void getCurrentUser(persisted.session.accessToken)
          .then((user) => {
            setSession({
              accessToken: persisted.session!.accessToken,
              user,
            });
            setOrderDraft((current) => ({
              ...current,
              orderedByFullName:
                current.orderedByFullName || user.name || current.orderedByFullName,
              address: user.address ? createOrderAddressDraft(user.address) : undefined,
            }));
          })
          .catch(() => {
            setSession(null);
          })
          .finally(() => {
            setHydrated(true);
          });
        return;
      }
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") {
      return;
    }

    persistState({
      session,
      recentOrders,
      cart,
      orderDraft,
    });
  }, [cart, hydrated, orderDraft, recentOrders, session]);

  const value: AppStoreValue = {
    hydrated,
    session,
    recentOrders,
    cart,
    orderDraft,
    cartCount: cart.length,
    async login(credentials) {
      const auth = await loginB2BRequest(credentials);
      const user = await getCurrentUser(auth.accessToken);

      setSession({
        accessToken: auth.accessToken,
        user,
      });
      setOrderDraft((current) => ({
        ...current,
        orderedByFullName: current.orderedByFullName || user.name || "",
        address: user.address ? createOrderAddressDraft(user.address) : undefined,
      }));

      return auth;
    },
    async logout() {
      if (session?.accessToken) {
        await logoutRequest(session.accessToken).catch(() => null);
      }

      persistState({
        session: null,
        recentOrders: [],
        cart: [],
        orderDraft: defaultDraft,
      });
      setSession(null);
      setRecentOrders([]);
      setCart([]);
      setOrderDraft(defaultDraft);
    },
    async saveProfile(patch) {
      if (!session) {
        throw new Error("Сессия недоступна.");
      }

      const user = await updateCurrentUserRequest(session.accessToken, {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.address !== undefined
          ? {
              address: patch.address ? toOrderAddressPayload(patch.address) ?? null : null,
            }
          : {}),
      });

      setSession({
        accessToken: session.accessToken,
        user,
      });
      setOrderDraft((current) => ({
        ...current,
        orderedByFullName: user.name ?? "",
        address: user.address ? createOrderAddressDraft(user.address) : undefined,
      }));

      return user;
    },
    addProduct(product) {
      setCart((current) => {
        const existing = current.find((item) => item.productId === product.id);

        if (!existing) {
          const initialQuantity = getInitialQuantityForUnit(product.unit);
          return [
            ...current,
            {
              productId: product.id,
              productName: product.name,
              unit: product.unit,
              imageUrl: normalizeAssetSource(product.picture),
              categoryName: product.category?.name,
              quantity: product.available ? initialQuantity : 0,
              quantityAvailable: product.quantity,
              available: product.available,
            },
          ].filter((item) => item.quantity > 0);
        }

        return current.map((item) => {
          if (item.productId !== product.id) {
            return item;
          }
          return {
            ...item,
            unit: product.unit,
            quantityAvailable: product.quantity,
            available: product.available,
            quantity: clampQuantity(
              incrementQuantity(item.quantity, product.unit),
              product.quantity,
            ),
          };
        });
      });
    },
    decrementProduct(productId) {
      setCart((current) => {
        return current
          .map((item) => {
            if (item.productId !== productId) {
              return item;
            }
            return {
              ...item,
              quantity: decrementQuantity(item.quantity, item.unit),
            };
          })
          .filter((item) => item.quantity > 0);
      });
    },
    setCartQuantity(productId, quantity) {
      setCart((current) => {
        return current
          .map((item) => {
            if (item.productId !== productId) {
              return item;
            }
            return {
              ...item,
              quantity: clampQuantity(
                normalizeQuantity(quantity, item.unit),
                item.quantityAvailable || quantity,
              ),
            };
          })
          .filter((item) => item.quantity > 0);
      });
    },
    replaceCartFromOrder(order) {
      setCart(
        order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          imageUrl: normalizeAssetSource(item.imageUrl),
          quantity: item.quantity,
          quantityAvailable: item.quantity,
          available: true,
        })),
      );
      setOrderDraft((current) => ({
        ...current,
        orderedByFullName: order.orderedByFullName ?? current.orderedByFullName,
        comments: order.comments ?? "",
      }));
    },
    rememberOrder(order) {
      setRecentOrders((current) => mergeRecentOrders(current, order));
    },
    completeOrder(order) {
      const nextState = createCompletedOrderPersistedState(
        {
          session,
          recentOrders,
          cart,
          orderDraft,
        },
        order,
      );

      persistState(nextState);
      setRecentOrders(nextState.recentOrders);
      setCart([]);
      setOrderDraft(nextState.orderDraft);
    },
    clearCart() {
      persistState(
        createClearedPersistedState({
          session,
          recentOrders,
          cart,
          orderDraft,
        }),
      );
      setCart([]);
      setOrderDraft((current) => ({
        ...current,
        comments: "",
      }));
    },
    updateDraft(patch) {
      setOrderDraft((current) => ({
        ...current,
        ...patch,
      }));
    },
  };

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error("useAppStore must be used inside AppStoreProvider");
  }

  return context;
}
