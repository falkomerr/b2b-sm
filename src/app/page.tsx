"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileAppFrame } from "@/components/mobile-app-frame";
import { appRoutes } from "@/lib/app-routes";
import { getProducts, type Product } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";
import { selectHomeProducts } from "@/lib/home-products";
import { ORDER_ACCEPTANCE_WINDOW_LABEL } from "@/lib/order-acceptance-window";
import { resolveProductImageUrl } from "@/lib/product-image";

const fontFamily =
  'SF Pro Text, SF Pro Display, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export default function HomePage() {
  const router = useRouter();
  const { addProduct, cart, hydrated, session } = useAppStore();
  const accessToken = session?.accessToken;
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
    if (!hydrated || !accessToken) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    void getProducts({ b2bFeaturedFirst: true })
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
  }, [accessToken, hydrated]);

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
    <MobileAppFrame mainClassName="px-3 pt-5">
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
    </MobileAppFrame>
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
            Заказы принимаются ежедневно
            <br />
            с {ORDER_ACCEPTANCE_WINDOW_LABEL} по Бишкеку
          </p>
        </div>

        <span className="mt-0.5 inline-flex h-7 items-center justify-center rounded-full bg-[#e6e6ed] px-3 text-[11px] leading-[13px] font-semibold tracking-[-0.08px] text-[#5a5b66]">
          {ORDER_ACCEPTANCE_WINDOW_LABEL}
        </span>
      </div>
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
  const imageUrl = resolveProductImageUrl(product.picture);

  return (
    <article className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_10px_32px_rgba(15,23,42,0.12)]">
      <div className="flex h-[116px] items-center justify-center">
        <Image
          src={imageUrl}
          alt={product.name}
          width={112}
          height={112}
          sizes="(max-width: 640px) 100px, 112px"
          className="h-[100px] w-[100px] object-contain"
        />
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
