import { resolveAssetUrl, type Product } from "./api";

export function selectHomeProducts(products: Product[], limit?: number): Product[] {
  const sortedProducts = [...products].sort((left, right) => {
    const leftHasImage = Number(Boolean(resolveAssetUrl(left.picture)));
    const rightHasImage = Number(Boolean(resolveAssetUrl(right.picture)));

    if (rightHasImage !== leftHasImage) {
      return rightHasImage - leftHasImage;
    }

    if (Number(right.available) !== Number(left.available)) {
      return Number(right.available) - Number(left.available);
    }

    if (right.quantity !== left.quantity) {
      return right.quantity - left.quantity;
    }

    return left.name.localeCompare(right.name, "ru");
  });

  if (typeof limit !== "number") {
    return sortedProducts;
  }

  return sortedProducts.slice(0, Math.max(0, limit));
}
