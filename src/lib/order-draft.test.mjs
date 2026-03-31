import { describe, expect, test } from "bun:test";
import {
  createOrderAddressDraft,
  hasRequiredOrderAddress,
  toOrderAddressPayload,
} from "./order-draft.ts";

describe("order draft helpers", () => {
  test("creates normalized draft address with empty fallbacks", () => {
    expect(
      createOrderAddressDraft({
        street: "Манаса",
        city: "Бишкек",
      }),
    ).toEqual({
      street: "Манаса",
      building: "",
      apartment: "",
      floor: "",
      city: "Бишкек",
    });
  });

  test("checks required checkout address fields", () => {
    expect(
      hasRequiredOrderAddress(
        createOrderAddressDraft({
          street: "Манаса",
          building: "50",
          city: "Бишкек",
        }),
      ),
    ).toBe(true);

    expect(
      hasRequiredOrderAddress(
        createOrderAddressDraft({
          street: "Манаса",
          city: "Бишкек",
        }),
      ),
    ).toBe(false);
  });

  test("builds trimmed address payload and omits empty optional fields", () => {
    expect(
      toOrderAddressPayload(
        createOrderAddressDraft({
          street: " Манаса ",
          building: " 50 ",
          apartment: " ",
          floor: " 3 ",
          city: " Бишкек ",
        }),
      ),
    ).toEqual({
      street: "Манаса",
      building: "50",
      floor: "3",
      city: "Бишкек",
    });
  });
});
