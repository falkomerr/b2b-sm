"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { appRoutes } from "@/lib/app-routes";
import { getProducts, resolveAssetUrl, type Product } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";
import { selectHomeProducts } from "@/lib/home-products";

const fontFamily =
  'SF Pro Text, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export default function HomePage() {
  const router = useRouter();
  const { addProduct, cart, hydrated, session } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!session) {
      startTransition(() => {
        router.replace(appRoutes.login);
      });
    }
  }, [hydrated, router, session]);

  useEffect(() => {
    if (!hydrated || !session) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    void getProducts({})
      .then((loadedProducts) => {
        if (!active) {
          return;
        }

        setProducts(selectHomeProducts(loadedProducts));
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить товары.",
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

  if (!hydrated || !session) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-white px-6 text-center"
        style={{ fontFamily }}
      >
        <div>
          <p className="text-[15px] leading-5 font-semibold tracking-[-0.3px] text-[#121212]">
            Открываю главную страницу
          </p>
          <p className="mt-2 text-[13px] leading-[18px] text-[#7A7A82]">
            Проверяю локальную сессию и перенаправляю на нужный экран.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]" style={{ fontFamily }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[392px] flex-col bg-white sm:my-5 sm:min-h-[852px] sm:overflow-hidden sm:rounded-[44px] sm:shadow-[0_28px_90px_rgba(18,18,18,0.14)]">
        <main className="flex-1 overflow-y-auto px-3 pb-6 pt-5">
          <NoticeCard />

          <section className="mt-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <HomeProductCardSkeleton key={`home-skeleton-${index}`} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[26px] bg-[#fff3f3] px-4 py-5 text-[13px] leading-[18px] text-[#bf4d4d]">
                {error}
              </div>
            ) : products.length ? (
              <div className="grid grid-cols-2 gap-4">
                {products.map((product) => {
                  const quantityInCart =
                    cart.find((item) => item.productId === product.id)?.quantity ?? 0;

                  return (
                    <HomeProductCard
                      key={product.id}
                      product={product}
                      quantityInCart={quantityInCart}
                      onAdd={() => addProduct(product)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[26px] bg-[#f4f4fb] px-4 py-5 text-[13px] leading-[18px] text-[#7f8089]">
                Товары для главной страницы пока недоступны.
              </div>
            )}
          </section>
        </main>

        <div className="flex justify-center pb-0 pt-3">
          <MobileTabBar />
        </div>
      </div>
    </div>
  );
}

function NoticeCard() {
  return (
    <section className="rounded-[26px] bg-[#f4f4fb] px-4 pb-4 pt-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <div className="flex items-start justify-between gap-3">
        <div className="max-w-[232px]">
          <h1 className="text-[17px] leading-[20px] font-semibold tracking-[-0.43px] text-[#1a1a1f]">
            Обратите внимание
          </h1>
          <p className="mt-1 text-[13px] leading-[17px] tracking-[-0.08px] text-[#8a8b94]">
            Заказы принимаются
            <br />
            с определенного периода
          </p>
        </div>

        <button
          type="button"
          aria-label="Закрыть уведомление"
          className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#e6e6ed] text-[#9898a3]"
        >
          <CloseSmallIcon />
        </button>
      </div>

      <button
        type="button"
        className="mt-4 inline-flex h-[34px] items-center justify-center rounded-full bg-[#1688ff] px-4 text-[14px] leading-[17px] font-semibold tracking-[-0.15px] text-white"
      >
        Уточнить период
      </button>
    </section>
  );
}

function HomeProductCard({
  onAdd,
  product,
  quantityInCart,
}: {
  onAdd: () => void;
  product: Product;
  quantityInCart: number;
}) {
  const imageUrl = resolveAssetUrl(product.picture);

  return (
    <article className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_10px_32px_rgba(15,23,42,0.12)]">
      <div className="flex h-[116px] items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={112}
            height={112}
            unoptimized
            className="h-[100px] w-[100px] object-contain"
          />
        ) : (
          <SalmonPackArt />
        )}
      </div>

      <h2 className="min-h-[54px] overflow-hidden text-[16px] leading-[19px] font-semibold tracking-[-0.38px] text-[#121212] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        {product.name}
      </h2>

      {quantityInCart > 0 ? (
        <Link
          href={appRoutes.cart}
          className="mt-3 flex h-[32px] items-center justify-center rounded-full bg-[#f0f1f5] text-[14px] leading-[17px] font-medium tracking-[-0.15px] text-[#1688ff] transition-transform active:scale-[0.99]"
        >
          В корзине
        </Link>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={!product.available}
          className={[
            "mt-3 flex h-[32px] w-full items-center justify-center rounded-full text-[14px] leading-[17px] font-medium tracking-[-0.15px] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#ececf1] disabled:text-[#a0a3ac]",
            product.available ? "bg-[#1688ff] text-white" : "",
          ].join(" ")}
        >
          {product.available ? "Заказать" : "Нет в наличии"}
        </button>
      )}
    </article>
  );
}

function HomeProductCardSkeleton() {
  return (
    <article className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_10px_32px_rgba(15,23,42,0.08)]">
      <div className="h-[116px] animate-pulse rounded-[24px] bg-[#f2f3f7]" />
      <div className="mt-3 h-5 animate-pulse rounded-full bg-[#f2f3f7]" />
      <div className="mt-2 h-5 w-4/5 animate-pulse rounded-full bg-[#f2f3f7]" />
      <div className="mt-3 h-[32px] animate-pulse rounded-full bg-[#eef2fb]" />
    </article>
  );
}

function SalmonPackArt() {
  return (
    <div className="relative h-[88px] w-[88px] rotate-[-12deg] rounded-[12px] bg-[linear-gradient(140deg,#2a3340_0%,#475265_20%,#e28b63_68%,#ffbb73_100%)] shadow-[0_12px_18px_rgba(15,23,42,0.18)]">
      <div className="absolute inset-x-[7px] top-[6px] h-[10px] rounded-full bg-[linear-gradient(90deg,#58409f,#7b5cbb_55%,#a481e1)]" />
      <div className="absolute left-[18px] top-[16px] h-[57px] w-[43px] rounded-[8px] bg-[linear-gradient(180deg,#ff7b22_0%,#f85719_40%,#ec3917_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
        <div className="absolute inset-x-2 top-[7px] h-[2px] rounded-full bg-[rgba(255,255,255,0.5)]" />
        <div className="absolute inset-x-2 top-[13px] h-[2px] rounded-full bg-[rgba(255,255,255,0.35)]" />
        <div className="absolute inset-x-2 top-[19px] h-[2px] rounded-full bg-[rgba(255,255,255,0.25)]" />
      </div>
      <div className="absolute right-[10px] top-[20px] flex h-[42px] w-[16px] flex-col justify-between">
        <span className="h-[6px] rounded-full bg-[#e0e4ea]" />
        <span className="h-[6px] rounded-full bg-[#d9dde4]" />
        <span className="h-[6px] rounded-full bg-[#cfd4dc]" />
      </div>
      <div className="absolute left-[8px] top-[24px] flex h-[30px] w-[9px] flex-col justify-between">
        <span className="h-[7px] rounded-full bg-[#bac3cf]" />
        <span className="h-[7px] rounded-full bg-[#aab5c2]" />
        <span className="h-[7px] rounded-full bg-[#98a5b3]" />
      </div>
      <div className="absolute bottom-[7px] left-[8px] h-[10px] w-[22px] rounded-[999px] bg-[#ff6c1d]" />
      <div className="absolute bottom-[8px] right-[8px] h-[12px] w-[20px] rounded-[999px] bg-[#ffc06b]" />
    </div>
  );
}

function CloseSmallIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M2 2 10 10" />
      <path d="M10 2 2 10" />
    </svg>
  );
}
