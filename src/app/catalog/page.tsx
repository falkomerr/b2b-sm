"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { ProtectedShell } from "@/components/protected-shell";
import { getCategories, getProducts, type Category, type Product } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";

export default function CatalogPage() {
  const { hydrated, session, cart, addProduct, decrementProduct } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!hydrated || !session) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    void Promise.all([
      getProducts({}),
      getCategories(),
    ])
      .then(([loadedProducts, loadedCategories]) => {
        if (!active) {
          return;
        }
        setProducts(loadedProducts);
        setCategories(loadedCategories);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить каталог.",
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hydrated, session]);

  const visibleProducts = products
    .filter((product) => {
      if (
        deferredSearch
        && !`${product.name} ${product.description ?? ""}`
          .toLowerCase()
          .includes(deferredSearch.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategory && product.category?.id !== selectedCategory) {
        return false;
      }
      if (availableOnly && !product.available) {
        return false;
      }
      return true;
    })
    .sort((left, right) => Number(right.available) - Number(left.available));

  return (
    <ProtectedShell
      title="Каталог продукции"
      description="Выберите позиции из общего ассортимента, сформируйте корпоративную заявку и отправьте ее без показа цены пользователю."
    >
      <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="panel h-fit">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--primary)]">
            Фильтры
          </p>
          <div className="mt-5 space-y-5">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Поиск</span>
              <input
                className="input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Название или описание"
              />
            </label>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Категории</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={[
                    "rounded-full px-4 py-2 text-sm transition",
                    !selectedCategory
                      ? "bg-[var(--primary)] text-white"
                      : "bg-white text-[var(--muted)]",
                  ].join(" ")}
                  onClick={() => setSelectedCategory("")}
                >
                  Все
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    className={[
                      "rounded-full px-4 py-2 text-sm transition",
                      selectedCategory === category.id
                        ? "bg-[var(--primary)] text-white"
                        : "bg-white text-[var(--muted)]",
                    ].join(" ")}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 rounded-[1.5rem] bg-white px-4 py-4">
              <input
                checked={availableOnly}
                onChange={(event) => setAvailableOnly(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm font-semibold">Только в наличии</span>
            </label>
          </div>
        </aside>

        <section className="space-y-5">
          {loading ? (
            <div className="panel flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[var(--primary)]" />
            </div>
          ) : error ? (
            <div className="panel bg-rose-50 text-sm text-rose-700">{error}</div>
          ) : visibleProducts.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {visibleProducts.map((product) => {
                const quantityInCart =
                  cart.find((item) => item.productId === product.id)?.quantity ?? 0;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantityInCart={quantityInCart}
                    onAdd={() => addProduct(product)}
                    onRemove={() => decrementProduct(product.id)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="panel text-sm text-[var(--muted)]">
              По текущим фильтрам товары не найдены.
            </div>
          )}
        </section>
      </div>
    </ProtectedShell>
  );
}
