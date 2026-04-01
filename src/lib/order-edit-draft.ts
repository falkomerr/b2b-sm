import {
  normalizeAssetSource,
  type Order,
  type Product,
  type UpdateOrderPayload,
} from "@/lib/api";
import { getInitialQuantityForUnit, getQuantityStep, type ProductUnit } from "@/lib/product-units";

export type OrderEditDraftItem = {
  id: string;
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  price: number;
  imageUrl?: string;
};

export type OrderEditDraft = {
  orderId: string;
  orderedByFullName: string;
  comments: string;
  address?: Order["address"];
  currency: string;
  items: OrderEditDraftItem[];
};

const ORDER_EDITABLE_START_MINUTES = 6 * 60;
const ORDER_EDITABLE_END_MINUTES = 23 * 60 + 50;
const ORDER_EDITABLE_TIMEZONE = "Asia/Bishkek";
const READONLY_ORDER_STATUSES = new Set(["D", "C"]);

function getBishkekDateParts(date: Date) {
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: ORDER_EDITABLE_TIMEZONE,
    year: "numeric",
  }).formatToParts(date);

  return {
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
  };
}

export function isOrderEditable(
  order: Pick<Order, "statusId" | "dateInsert">,
  now = new Date(),
) {
  if (READONLY_ORDER_STATUSES.has(order.statusId)) {
    return false;
  }

  const currentDateParts = getBishkekDateParts(now);
  const orderDateParts = getBishkekDateParts(new Date(order.dateInsert));

  if (!currentDateParts || !orderDateParts) {
    return false;
  }

  const isSameBishkekDay =
    currentDateParts.year === orderDateParts.year
    && currentDateParts.month === orderDateParts.month
    && currentDateParts.day === orderDateParts.day;
  const currentMinutes = currentDateParts.hour * 60 + currentDateParts.minute;

  return (
    isSameBishkekDay
    && currentMinutes >= ORDER_EDITABLE_START_MINUTES
    && currentMinutes <= ORDER_EDITABLE_END_MINUTES
  );
}

export function createOrderEditDraft(order: Pick<
  Order,
  "id" | "orderedByFullName" | "comments" | "address" | "currency" | "items"
>): OrderEditDraft {
  return {
    orderId: order.id,
    orderedByFullName: order.orderedByFullName ?? "",
    comments: order.comments ?? "",
    address: order.address ?? undefined,
    currency: order.currency,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      price: item.price,
      imageUrl: normalizeAssetSource(item.imageUrl),
    })),
  };
}

export function addProductToOrderEditDraft(
  draft: OrderEditDraft,
  product: Pick<Product, "id" | "name" | "price" | "available" | "quantity" | "picture" | "unit">,
): OrderEditDraft {
  if (!product.available || product.quantity <= 0) {
    return draft;
  }

  const nextImageUrl = normalizeAssetSource(product.picture);
  const existingItem = draft.items.find((item) => item.productId === product.id);
  const quantityStep = getQuantityStep(product.unit);

  if (existingItem) {
    return {
      ...draft,
      items: draft.items.map((item) =>
        item.productId === product.id
          ? {
              ...item,
              unit: product.unit,
              quantity: item.quantity + quantityStep,
              price: product.price,
              imageUrl: nextImageUrl ?? item.imageUrl,
            }
          : item,
      ),
    };
  }

  return {
    ...draft,
    items: [
      ...draft.items,
      {
        id: product.id,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: getInitialQuantityForUnit(product.unit),
        price: product.price,
        ...(nextImageUrl ? { imageUrl: nextImageUrl } : {}),
      },
    ],
  };
}

export function updateOrderEditDraftItemQuantity(
  draft: OrderEditDraft,
  productId: string,
  quantity: number,
): OrderEditDraft {
  if (quantity <= 0) {
    return removeProductFromOrderEditDraft(draft, productId);
  }

  return {
    ...draft,
    items: draft.items.map((item) =>
      item.productId === productId
        ? {
            ...item,
            quantity,
          }
        : item,
    ),
  };
}

export function removeProductFromOrderEditDraft(
  draft: OrderEditDraft,
  productId: string,
): OrderEditDraft {
  return {
    ...draft,
    items: draft.items.filter((item) => item.productId !== productId),
  };
}

export function syncOrderEditDraftWithCatalogProducts(
  draft: OrderEditDraft,
  products: Product[],
): OrderEditDraft {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return {
    ...draft,
    items: draft.items.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        return item;
      }

      return {
        ...item,
        unit: product.unit,
        price: product.price,
        imageUrl: product.picture ? normalizeAssetSource(product.picture) : item.imageUrl,
      };
    }),
  };
}

export function getOrderEditDraftTotal(draft: Pick<OrderEditDraft, "items">) {
  return draft.items.reduce((total, item) => total + item.price * item.quantity, 0);
}

export function getOrderEditDraftItemCount(draft: Pick<OrderEditDraft, "items">) {
  return draft.items.length;
}

export function getOrderEditDraftValidationError(
  draft: Pick<OrderEditDraft, "items" | "orderedByFullName">,
) {
  if (!draft.orderedByFullName.trim()) {
    return "Укажите ФИО оформляющего.";
  }

  if (!draft.items.length) {
    return "В заказе не осталось товаров.";
  }

  return null;
}

export function toUpdateOrderPayload(
  draft: Pick<OrderEditDraft, "items" | "orderedByFullName" | "comments">,
): UpdateOrderPayload {
  return {
    items: draft.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    orderedByFullName: draft.orderedByFullName.trim(),
    comments: draft.comments.trim() || undefined,
  };
}
