import { describe, expect, test } from "bun:test";
import { selectHomeProducts } from "./home-products.ts";

describe("selectHomeProducts", () => {
  test("prefers available pictured products and respects limit", () => {
    const products = [
      {
        id: "no-image",
        name: "Без картинки",
        price: 0,
        currency: "KGS",
        quantity: 9,
        available: true,
        isB2bFeatured: true,
      },
      {
        id: "with-image-b",
        name: "С картинкой B",
        picture: "/products/b.jpg",
        price: 0,
        currency: "KGS",
        quantity: 2,
        available: true,
      },
      {
        id: "with-image-a",
        name: "С картинкой A",
        picture: "/products/a.jpg",
        price: 0,
        currency: "KGS",
        quantity: 7,
        available: true,
      },
      {
        id: "unavailable-with-image",
        name: "Недоступный, но с картинкой",
        picture: "/products/c.jpg",
        price: 0,
        currency: "KGS",
        quantity: 0,
        available: false,
      },
      {
        id: "with-image-c",
        name: "С картинкой C",
        picture: "/products/d.jpg",
        price: 0,
        currency: "KGS",
        quantity: 5,
        available: true,
      },
    ];

    expect(selectHomeProducts(products, 3).map((product) => product.id)).toEqual([
      "with-image-a",
      "with-image-c",
      "with-image-b",
    ]);
  });

  test("returns all pictured products when limit is omitted", () => {
    const products = [
      {
        id: "no-image",
        name: "Без картинки",
        price: 0,
        currency: "KGS",
        quantity: 9,
        available: true,
        isB2bFeatured: true,
      },
      {
        id: "with-image-b",
        name: "С картинкой B",
        picture: "/products/b.jpg",
        price: 0,
        currency: "KGS",
        quantity: 2,
        available: true,
      },
      {
        id: "with-image-a",
        name: "С картинкой A",
        picture: "/products/a.jpg",
        price: 0,
        currency: "KGS",
        quantity: 7,
        available: true,
      },
      {
        id: "unavailable-with-image",
        name: "Недоступный, но с картинкой",
        picture: "/products/c.jpg",
        price: 0,
        currency: "KGS",
        quantity: 0,
        available: false,
      },
      {
        id: "with-image-c",
        name: "С картинкой C",
        picture: "/products/d.jpg",
        price: 0,
        currency: "KGS",
        quantity: 5,
        available: true,
      },
    ];

    expect(selectHomeProducts(products).map((product) => product.id)).toEqual([
      "with-image-a",
      "with-image-c",
      "with-image-b",
      "unavailable-with-image",
    ]);
  });

  test("returns an empty list when limit is zero", () => {
    const products = [
      {
        id: "with-image",
        name: "С картинкой",
        picture: "/products/a.jpg",
        price: 0,
        currency: "KGS",
        quantity: 7,
        available: true,
      },
    ];

    expect(selectHomeProducts(products, 0)).toEqual([]);
  });
});
