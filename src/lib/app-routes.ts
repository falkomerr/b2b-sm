export const appRoutes = {
  home: "/",
  login: "/login",
  catalog: "/catalog",
  cart: "/cart",
  orders: "/orders",
  account: "/account",
} as const;

export function getOrderDetailsRoute(orderId: string) {
  return `${appRoutes.orders}/${encodeURIComponent(orderId)}`;
}

export const primaryNavigation = [
  { href: appRoutes.catalog, label: "Каталог" },
  { href: appRoutes.cart, label: "Корзина" },
  { href: appRoutes.orders, label: "Заказы" },
  { href: appRoutes.account, label: "Аккаунт" },
] as const;
