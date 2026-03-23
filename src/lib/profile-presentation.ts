import type { Order } from "@/lib/api";

const ORDER_TIMEZONE = "Asia/Bishkek";

const statusLabels: Record<string, string> = {
  C: "Отменен",
  D: "Доставлен",
  N: "Новый",
  P: "В обработке",
  S: "Отправлен",
};

export type OrderStatusTone = "success" | "danger" | "neutral";

export function formatOrderMoney(value: number, currency: string) {
  const amount = new Intl.NumberFormat("ru-RU").format(value).replaceAll("\u00A0", " ");

  if (currency === "KGS") {
    return `${amount} сом`;
  }

  return `${amount} ${currency}`;
}

export function formatOrderDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: ORDER_TIMEZONE,
    year: "numeric",
  }).format(new Date(value));
}

export function formatOrderStatusLabel(statusId: string) {
  return statusLabels[statusId] ?? statusId;
}

export function formatOrderStatusTone(statusId: string): OrderStatusTone {
  if (statusId === "D") {
    return "success";
  }

  if (statusId === "C") {
    return "danger";
  }

  return "neutral";
}

export function getOrderItemCount(order: Pick<Order, "items">) {
  return order.items.length;
}
