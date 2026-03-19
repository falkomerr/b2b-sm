"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MobileAppFrame } from "@/components/mobile-app-frame";
import { appRoutes, getOrderDetailsRoute } from "@/lib/app-routes";
import { createOrder, resolveAssetUrl, validateCart } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";
import {
  createOrderAddressDraft,
  hasRequiredOrderAddress,
  toOrderAddressPayload,
} from "@/lib/order-draft";
import {
  getCartItemMeta,
  getSelectionCopy,
  reconcileSelectedCartIds,
} from "@/lib/mobile-cart";

const emptyCartImageSrc = "/assets/cart/empty-cart-fish-5d8ecb.png";

export default function CartPage() {
  const router = useRouter();
  const {
    hydrated,
    session,
    cart,
    orderDraft,
    addProduct,
    clearCart,
    completeOrder,
    decrementProduct,
    setCartQuantity,
    updateDraft,
  } = useAppStore();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const previousCartProductIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (hydrated && !session) {
      router.replace(appRoutes.login);
    }
  }, [hydrated, router, session]);

  useEffect(() => {
    const cartProductIds = cart.map((item) => item.productId);

    setSelectedProductIds((currentSelection) =>
      reconcileSelectedCartIds({
        cartProductIds,
        previousCartProductIds: previousCartProductIdsRef.current,
        selectedProductIds: currentSelection,
      }),
    );

    previousCartProductIdsRef.current = cartProductIds;
  }, [cart]);

  const hasItems = cart.length > 0;
  const orderAddress = createOrderAddressDraft(orderDraft.address);
  const selectionCopy = getSelectionCopy({
    totalCount: cart.length,
    selectedCount: selectedProductIds.length,
  });

  async function handleSubmit() {
    if (!session) {
      return;
    }

    if (!cart.length) {
      setError("Корзина пуста.");
      return;
    }

    if (!orderDraft.orderedByFullName.trim()) {
      setError("Укажите ФИО оформляющего.");
      return;
    }

    if (!hasRequiredOrderAddress(orderAddress)) {
      setError("Укажите адрес доставки.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const validation = await validateCart(
        cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      );

      if (!validation.valid) {
        throw new Error(validation.error || "Часть товаров больше недоступна.");
      }

      const order = await createOrder(
        {
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          orderedByFullName: orderDraft.orderedByFullName.trim(),
          comments: orderDraft.comments.trim() || undefined,
          address: toOrderAddressPayload(orderAddress),
        },
        session.accessToken,
      );

      completeOrder(order);
      router.push(getOrderDetailsRoute(order.id));
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось оформить заказ.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleToggleSelection() {
    if (selectedProductIds.length === cart.length) {
      setSelectedProductIds([]);
      return;
    }

    setSelectedProductIds(cart.map((item) => item.productId));
  }

  function handleDeleteSelected() {
    if (!selectedProductIds.length) {
      return;
    }

    if (selectedProductIds.length === cart.length) {
      clearCart();
      setSelectedProductIds([]);
      setError(null);
      return;
    }

    for (const productId of selectedProductIds) {
      setCartQuantity(productId, 0);
    }

    setError(null);
  }

  if (!hydrated || !session) {
    return (
      <MobileAppFrame>
        <div className="flex min-h-full flex-col items-center justify-center px-8 pb-16 text-center">
          <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
            Открываю корзину
          </p>
          <p className="mt-2 text-[13px] leading-[18px] tracking-[-0.08px] text-[#8e8e93]">
            Проверяю сессию компании и подготавливаю заказ.
          </p>
        </div>
      </MobileAppFrame>
    );
  }

  return (
    <MobileAppFrame
      footer={
        hasItems ? (
          <CartFooter
            error={error}
            isSubmitting={isSubmitting}
            itemCount={cart.reduce((total, item) => total + item.quantity, 0)}
            onSubmit={handleSubmit}
          />
        ) : undefined
      }
      tabBarFixed
      mainClassName={!hasItems ? "!pt-0 min-h-screen" : ""}
    >
      {hasItems ? (
        <div className="px-4 pb-6 pt-4">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleToggleSelection}
              className="inline-flex items-center gap-2 text-left text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]"
            >
              <SelectionCheckbox checked={selectedProductIds.length === cart.length} />
              <span>{selectionCopy.toggleLabel}</span>
            </button>

            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={!selectedProductIds.length}
              className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#ff383c] disabled:text-[#ffb8ba]"
            >
              {selectionCopy.deleteLabel}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {cart.map((item) => (
              <CartItemCard
                key={item.productId}
                checked={selectedProductIds.includes(item.productId)}
                item={item}
                onDecrement={() => decrementProduct(item.productId)}
                onIncrement={() =>
                  addProduct({
                    id: item.productId,
                    name: item.productName,
                    price: 0,
                    currency: "KGS",
                    quantity: item.quantityAvailable || item.quantity,
                    available: item.available,
                    picture: item.imageUrl,
                    category: item.categoryName
                      ? { id: item.productId, name: item.categoryName }
                      : undefined,
                  })
                }
                onToggle={() =>
                  setSelectedProductIds((currentSelection) => {
                    if (currentSelection.includes(item.productId)) {
                      return currentSelection.filter(
                        (productId) => productId !== item.productId,
                      );
                    }

                    return [...currentSelection, item.productId];
                  })
                }
              />
            ))}
          </div>

          <section className="mt-6 rounded-[28px] bg-[#f7f8fb] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <p className="text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-[#121212]">
              Данные для заказа
            </p>
            <p className="mt-1 text-[13px] leading-[18px] tracking-[-0.08px] text-[#8e8e93]">
              Заказ оформляется по всем позициям, которые сейчас лежат в корзине.
            </p>

            <div className="mt-4 grid gap-3">
              <label className="block">
                <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                  Город
                </span>
                <input
                  value={orderAddress.city}
                  onChange={(event) =>
                    updateDraft({
                      address: {
                        ...orderAddress,
                        city: event.target.value,
                      },
                    })
                  }
                  placeholder="Например, Бишкек"
                  className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-white px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                    Улица
                  </span>
                  <input
                    value={orderAddress.street}
                    onChange={(event) =>
                      updateDraft({
                        address: {
                          ...orderAddress,
                          street: event.target.value,
                        },
                      })
                    }
                    placeholder="Например, Манаса"
                    className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-white px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                    Дом
                  </span>
                  <input
                    value={orderAddress.building}
                    onChange={(event) =>
                      updateDraft({
                        address: {
                          ...orderAddress,
                          building: event.target.value,
                        },
                      })
                    }
                    placeholder="Например, 50"
                    className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-white px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                    Квартира
                  </span>
                  <input
                    value={orderAddress.apartment}
                    onChange={(event) =>
                      updateDraft({
                        address: {
                          ...orderAddress,
                          apartment: event.target.value,
                        },
                      })
                    }
                    placeholder="Опционально"
                    className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-white px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
                  />
                </label>

                <label className="block">
                  <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                    Этаж
                  </span>
                  <input
                    value={orderAddress.floor}
                    onChange={(event) =>
                      updateDraft({
                        address: {
                          ...orderAddress,
                          floor: event.target.value,
                        },
                      })
                    }
                    placeholder="Опционально"
                    className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-white px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
                  />
                </label>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                ФИО оформляющего
              </span>
              <input
                value={orderDraft.orderedByFullName}
                onChange={(event) =>
                  updateDraft({ orderedByFullName: event.target.value })
                }
                placeholder="Например, Иван Иванов"
                className="mt-2 w-full rounded-[18px] border border-[#ececf2] bg-white px-4 py-3 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
                Комментарий
              </span>
              <textarea
                value={orderDraft.comments}
                onChange={(event) => updateDraft({ comments: event.target.value })}
                placeholder="Время доставки, пожелания, контакт"
                className="mt-2 min-h-[108px] w-full resize-none rounded-[22px] border border-[#ececf2] bg-white px-4 py-3 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
              />
            </label>
          </section>
        </div>
      ) : (
        <EmptyCartState />
      )}
    </MobileAppFrame>
  );
}

function EmptyCartState() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">
      <div className="relative h-[107px] w-[204px]">
        <Image
          src={emptyCartImageSrc}
          alt="Пустая корзина"
          fill
          priority
          className="object-contain"
        />
      </div>

      <h1 className="mt-7 text-[22px] leading-7 font-bold tracking-[-0.26px] text-black">
        Корзина пустая
      </h1>
      <p className="mt-2 max-w-[261px] text-[17px] leading-[22px] tracking-[-0.43px] text-[#8e8e93]">
        Вы можете заказать товары прямо сейчас
      </p>

      <Link
        href={appRoutes.catalog}
        className="mt-4 inline-flex h-[34px] items-center justify-center rounded-full bg-[#1688ff] px-[14px] text-[15px] leading-5 tracking-[-0.23px] text-white visited:!text-white hover:!text-white focus:!text-white active:!text-white no-underline"
      >
        Перейти к товарам
      </Link>
    </div>
  );
}

function CartItemCard({
  checked,
  item,
  onDecrement,
  onIncrement,
  onToggle,
}: {
  checked: boolean;
  item: ReturnType<typeof useAppStore>["cart"][number];
  onDecrement: () => void;
  onIncrement: () => void;
  onToggle: () => void;
}) {
  const imageUrl = resolveAssetUrl(item.imageUrl);

  return (
    <article className="relative rounded-[28px] bg-white px-3 py-3 shadow-[0_2px_25px_rgba(0,0,0,0.14)]">
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-3"
        aria-label={checked ? "Убрать товар из выделения" : "Выделить товар"}
      >
        <SelectionCheckbox checked={checked} />
      </button>

      <div className="flex gap-3 pr-9">
        <div className="flex h-[75px] w-[93px] items-center justify-center overflow-hidden rounded-[16px] bg-[#f2f2f7]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.productName}
              width={78}
              height={78}
              unoptimized
              className="h-[72px] w-[72px] object-contain drop-shadow-[0_10px_12px_rgba(15,23,42,0.16)]"
            />
          ) : (
            <div className="h-[56px] w-[56px] rounded-[14px] bg-[linear-gradient(135deg,#2b3441_0%,#475164_24%,#ff9158_72%,#ffc077_100%)]" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="max-w-[185px] text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
            {item.productName}
          </h2>
          <p className="mt-2 text-[12px] leading-4 text-[#8e8e93]">
            {getCartItemMeta(item)}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span
              className={[
                "rounded-full px-2.5 py-1 text-[11px] leading-[13px] font-medium tracking-[-0.08px]",
                item.available
                  ? "bg-[#eef7ea] text-[#4d8a32]"
                  : "bg-[#f5f5f7] text-[#8e8e93]",
              ].join(" ")}
            >
              {item.available ? "В наличии" : "Нет в наличии"}
            </span>

            <QuantityStepper
              disabled={!item.available}
              onDecrement={onDecrement}
              onIncrement={onIncrement}
              quantity={item.quantity}
              incrementDisabled={item.quantity >= item.quantityAvailable}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function CartFooter({
  error,
  isSubmitting,
  itemCount,
  onSubmit,
}: {
  error: string | null;
  isSubmitting: boolean;
  itemCount: number;
  onSubmit: () => void;
}) {
  return (
    <div className="border-t border-[#f0f1f5] bg-white px-4 pb-4 pt-3 shadow-[0_-14px_34px_rgba(15,23,42,0.08)]">
      <div className="mb-2 flex items-center justify-between text-[12px] leading-4 text-[#8e8e93]">
        <span>К оформлению</span>
        <span>{itemCount} поз.</span>
      </div>

      {error ? (
        <div className="mb-3 rounded-[16px] bg-[#fff2f2] px-4 py-3 text-[13px] leading-[18px] tracking-[-0.08px] text-[#bf4d4d]">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        className="flex h-[48px] w-full items-center justify-center rounded-full bg-[#1688ff] text-[16px] leading-[19px] font-semibold tracking-[-0.38px] text-white transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#9bcbff]"
      >
        {isSubmitting ? "Отправляем заказ..." : "Оформить заказ"}
      </button>
    </div>
  );
}

function QuantityStepper({
  disabled,
  incrementDisabled,
  onDecrement,
  onIncrement,
  quantity,
}: {
  disabled: boolean;
  incrementDisabled: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
  quantity: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[#f4f5f7] px-2 py-1">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[16px] leading-none text-[#121212] shadow-[0_4px_10px_rgba(15,23,42,0.08)] disabled:text-[#c6c7cf]"
      >
        -
      </button>
      <span className="min-w-[16px] text-center text-[14px] leading-[17px] font-semibold tracking-[-0.15px] text-[#121212]">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled || incrementDisabled}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1688ff] text-[16px] leading-none text-white disabled:bg-[#cfe4fb]"
      >
        +
      </button>
    </div>
  );
}

function SelectionCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "flex h-6 w-6 items-center justify-center rounded-[8px] border transition-colors",
        checked
          ? "border-[#1688ff] bg-[#1688ff] text-white"
          : "border-[#d9dce5] bg-white text-transparent",
      ].join(" ")}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
        <path
          d="m3.5 8.3 2.6 2.6 6-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
