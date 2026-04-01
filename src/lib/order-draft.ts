export type OrderAddress = {
  street: string;
  building: string;
  apartment?: string;
  floor?: string;
  city: string;
};

export type OrderAddressDraft = {
  street: string;
  building: string;
  apartment: string;
  floor: string;
  city: string;
};

export const emptyOrderAddress: OrderAddressDraft = {
  street: "",
  building: "",
  apartment: "",
  floor: "",
  city: "",
};

export function createOrderAddressDraft(
  value?: Partial<OrderAddressDraft> | Partial<OrderAddress> | null,
): OrderAddressDraft {
  return {
    street: value?.street ?? "",
    building: value?.building ?? "",
    apartment: value?.apartment ?? "",
    floor: value?.floor ?? "",
    city: value?.city ?? "",
  };
}

export function hasRequiredOrderAddress(address: OrderAddressDraft) {
  return Boolean(
    address.street.trim() && address.building.trim() && address.city.trim(),
  );
}

export function isEmptyOrderAddress(address: OrderAddressDraft) {
  return !(
    address.street.trim()
    || address.building.trim()
    || address.apartment.trim()
    || address.floor.trim()
    || address.city.trim()
  );
}

export function toOrderAddressPayload(address: OrderAddressDraft) {
  const street = address.street.trim();
  const building = address.building.trim();
  const apartment = address.apartment.trim();
  const floor = address.floor.trim();
  const city = address.city.trim();

  if (!street || !building || !city) {
    return undefined;
  }

  return {
    street,
    building,
    ...(apartment ? { apartment } : {}),
    ...(floor ? { floor } : {}),
    city,
  };
}
