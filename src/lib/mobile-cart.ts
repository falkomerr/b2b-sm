import { formatQuantity, type ProductUnit } from "./product-units";

type ReconcileSelectedCartIdsArgs = {
  cartProductIds: string[];
  previousCartProductIds: string[];
  selectedProductIds: string[];
};

type CartMetaArgs = {
  categoryName?: string | null;
  quantity: number;
  unit: ProductUnit;
};

type SelectionCopyArgs = {
  totalCount: number;
  selectedCount: number;
};

export function reconcileSelectedCartIds({
  cartProductIds,
  previousCartProductIds,
  selectedProductIds,
}: ReconcileSelectedCartIdsArgs) {
  const previousCartIds = new Set(previousCartProductIds);
  const selectedIds = new Set(selectedProductIds);

  for (const productId of cartProductIds) {
    if (!previousCartIds.has(productId)) {
      selectedIds.add(productId);
    }
  }

  return cartProductIds.filter((productId) => selectedIds.has(productId));
}

export function getCartItemMeta({ categoryName, quantity, unit }: CartMetaArgs) {
  const normalizedCategoryName = categoryName?.trim();

  return [
    normalizedCategoryName || "Поставка из общего каталога",
    formatQuantity(quantity, unit),
  ].join(" • ");
}

export function getSelectionCopy({
  totalCount,
  selectedCount,
}: SelectionCopyArgs) {
  return {
    toggleLabel:
      totalCount > 0 && selectedCount === totalCount
        ? "Отменить выбор"
        : "Выбрать все",
    deleteLabel: `Удалить • ${selectedCount}`,
  };
}
