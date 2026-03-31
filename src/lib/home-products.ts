import { resolveAssetUrl, type Product } from "./api";

export function selectHomeProducts(products: Product[], limit = 4) {
  return [...products]
    .sort((left, right) => {
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
    })
    .slice(0, limit);
}
