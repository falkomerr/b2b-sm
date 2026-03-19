import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/button";
import { getOrderDetailsRoute } from "@/lib/app-routes";
import { createOrder, validateCart, type CartSnapshotItem } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";
import {
  createOrderAddressDraft,
  hasRequiredOrderAddress,
  toOrderAddressPayload,
} from "@/lib/order-draft";

export function CartPanel({ sticky = true }: { sticky?: boolean }) {
  const router = useRouter();
  const {
    session,
    cart,
    orderDraft,
    decrementProduct,
    addProduct,
    clearCart,
    completeOrder,
    updateDraft,
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const orderAddress = createOrderAddressDraft(session?.user.address);

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
      setError("Укажите адрес доставки в настройках профиля.");
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
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось отправить заявку.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside
      className={[
        "panel flex flex-col gap-5",
        sticky ? "sticky top-6" : "",
      ].join(" ")}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--primary)]">
          Корзина
        </p>
        <h2 className="mt-3 text-2xl font-semibold">Заявка на поставку</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Соберите состав, укажите сотрудника-оформителя и отправьте заявку без
          отображения цен.
        </p>
      </div>

      <div className="space-y-3">
        {cart.length ? (
          cart.map((item) => (
            <CartRow
              key={item.productId}
              item={item}
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
              onDecrement={() => decrementProduct(item.productId)}
            />
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted)]">
            Корзина пока пустая. Добавьте товары из каталога.
          </div>
        )}
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold">ФИО оформляющего</span>
        <input
          value={orderDraft.orderedByFullName}
          onChange={(event) =>
            updateDraft({ orderedByFullName: event.target.value })
          }
          placeholder="Например, Иван Иванов"
          className="input"
        />
      </label>

      <div className="space-y-3">
        <p className="text-sm font-semibold">Адрес доставки</p>
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          {hasRequiredOrderAddress(orderAddress)
            ? formatAddressPreview(orderAddress)
            : "Адрес доставки указывается в настройках профиля."}
        </div>
      </div>

      <label className="space-y-2">
        <span className="text-sm font-semibold">Комментарий к заявке</span>
        <textarea
          value={orderDraft.comments}
          onChange={(event) => updateDraft({ comments: event.target.value })}
          placeholder="Опционально: время доставки, пожелания, контакт"
          className="input min-h-28 resize-none rounded-[1.5rem] py-4"
        />
      </label>

      {error ? (
        <div className="rounded-[1.25rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <Button onClick={handleSubmit} disabled={!cart.length || isSubmitting}>
          {isSubmitting ? "Отправка..." : "Отправить заявку"}
        </Button>
        <Button
          variant="secondary"
          disabled={!cart.length || isSubmitting}
          onClick={clearCart}
        >
          Очистить корзину
        </Button>
      </div>
    </aside>
  );
}

function formatAddressPreview(address: ReturnType<typeof createOrderAddressDraft>) {
  return [
    address.city.trim(),
    `${address.street.trim()} ${address.building.trim()}`.trim(),
    address.apartment.trim() ? `кв. ${address.apartment.trim()}` : "",
    address.floor.trim() ? `этаж ${address.floor.trim()}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function CartRow({
  item,
  onIncrement,
  onDecrement,
}: {
  item: CartSnapshotItem;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center gap-3">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width={64}
            height={64}
            sizes="64px"
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-white" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.productName}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {item.categoryName ?? "Поставка из общего каталога"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
          Без цены
        </span>
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-9 px-3" onClick={onDecrement}>
            -
          </Button>
          <div className="min-w-10 rounded-full bg-white px-3 py-2 text-center text-sm font-semibold">
            {item.quantity}
          </div>
          <Button
            className="h-9 px-3"
            onClick={onIncrement}
            disabled={!item.available || item.quantity >= item.quantityAvailable}
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}
