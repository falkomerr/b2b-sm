export const appRoutes = {
  home: "/",
  login: "/login",
  cart: "/cart",
  orders: "/orders",
  account: "/account",
} as const;

export function getOrderDetailsRoute(orderId: string) {
  return `${appRoutes.orders}/${encodeURIComponent(orderId)}`;
}
