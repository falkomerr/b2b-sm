export type ProductUnit = "piece" | "kg";

const PRODUCT_UNIT_STEPS: Record<ProductUnit, number> = {
  piece: 1,
  kg: 1,
};

function formatKgQuantity(quantity: number) {
  return Number(quantity.toFixed(2)).toString();
}

export function formatQuantityValue(quantity: number, unit: ProductUnit) {
  if (unit === "piece") {
    return String(Math.round(quantity));
  }

  return formatKgQuantity(quantity);
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
  return unit === "kg";
}

export function normalizeQuantity(quantity: number, unit: ProductUnit) {
  if (unit === "piece") {
    return Math.round(quantity);
  }

  return Number(quantity.toFixed(2));
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

  if (unit === "piece") {
    return Number.isInteger(quantity) ? quantity : null;
  }

  const [, fractional = ""] = normalized.split(".");
  return fractional.length <= 2 ? quantity : null;
}
