import {
  normalizeAssetSource,
  type Order,
  type Product,
  type UpdateOrderPayload,
} from "@/lib/api";

export type OrderEditDraftItem = {
  id: string;
  productId: string;
  productName: string;
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

export function isOrderEditable(statusId: string) {
  return !new Set(["D", "C"]).has(statusId);
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
      quantity: item.quantity,
      price: item.price,
      imageUrl: normalizeAssetSource(item.imageUrl),
    })),
  };
}

export function addProductToOrderEditDraft(
  draft: OrderEditDraft,
  product: Pick<Product, "id" | "name" | "price" | "available" | "quantity" | "picture">,
): OrderEditDraft {
  if (!product.available || product.quantity <= 0) {
    return draft;
  }

  const nextImageUrl = normalizeAssetSource(product.picture);
  const existingItem = draft.items.find((item) => item.productId === product.id);

  if (existingItem) {
    return {
      ...draft,
      items: draft.items.map((item) =>
        item.productId === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
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
        quantity: 1,
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
  return draft.items.reduce((total, item) => total + item.quantity, 0);
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
