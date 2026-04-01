export type ProductUnit = "piece" | "kg";

const PRODUCT_UNIT_STEPS: Record<ProductUnit, number> = {
  piece: 1,
  kg: 1,
};

const PRODUCT_UNIT_FRACTION_DIGITS: Record<ProductUnit, number> = {
  piece: 2,
  kg: 2,
};

export function formatQuantityValue(quantity: number, unit: ProductUnit) {
  return Number(quantity.toFixed(PRODUCT_UNIT_FRACTION_DIGITS[unit])).toString();
}

export function formatQuantity(quantity: number, unit: ProductUnit) {
  return `${formatQuantityValue(quantity, unit)} ${unit === "kg" ? "кг" : "шт"}`;
}

export function formatPricePerUnit(priceLabel: string, unit: ProductUnit) {
  return `${priceLabel} / ${unit === "kg" ? "кг" : "шт"}`;
}

export function getInitialQuantityForUnit(unit: ProductUnit) {
  return PRODUCT_UNIT_STEPS[unit];
}

export function getQuantityStep(unit: ProductUnit) {
  return PRODUCT_UNIT_STEPS[unit];
}

export function isManualQuantityInputEnabled(unit: ProductUnit) {
  return unit === "piece" || unit === "kg";
}

export function normalizeQuantity(quantity: number, unit: ProductUnit) {
  return Number(quantity.toFixed(PRODUCT_UNIT_FRACTION_DIGITS[unit]));
}

export function incrementQuantity(quantity: number, unit: ProductUnit) {
  return normalizeQuantity(quantity + getQuantityStep(unit), unit);
}

export function decrementQuantity(quantity: number, unit: ProductUnit) {
  return normalizeQuantity(quantity - getQuantityStep(unit), unit);
}

export function canIncrementQuantity(
  quantity: number,
  maxQuantity: number,
  unit: ProductUnit,
) {
  return incrementQuantity(quantity, unit) <= normalizeQuantity(maxQuantity, unit) + 0.000001;
}

export function parseQuantityInput(rawValue: string, unit: ProductUnit) {
  const normalized = rawValue.trim().replaceAll(",", ".");

  if (!normalized || !/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const quantity = Number(normalized);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return null;
  }

  const [, fractional = ""] = normalized.split(".");
  return fractional.length <= PRODUCT_UNIT_FRACTION_DIGITS[unit] ? quantity : null;
}
