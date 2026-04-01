import { resolveAssetUrl } from "@/lib/api";

export const productFallbackImageSrc = "/assets/profile/order-item-fish-2ab092.png";

export function resolveProductImageUrl(source?: string | null) {
  return resolveAssetUrl(source) ?? productFallbackImageSrc;
}
