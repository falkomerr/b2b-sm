"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { MobileAppFrame } from "@/components/mobile-app-frame";
import { appRoutes } from "@/lib/app-routes";
import { getOrders, resolveAssetUrl, type Order } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";
import {
  formatOrderDateTime,
  formatOrderMoney,
  formatOrderStatusLabel,
  formatOrderStatusTone,
  getOrderItemCount,
} from "@/lib/profile-presentation";

const orderItemFallbackSrc = "/assets/profile/order-item-fish-2ab092.png";
const supportPhoneHref = "tel:+996705275206";

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const { hydrated, recentOrders, rememberOrder, replaceCartFromOrder, session } =
    useAppStore();
  const [order, setOrder] = useState<Order | null>(() => {
    return recentOrders.find((candidate) => candidate.id === orderId) ?? null;
  });
  const [loading, setLoading] = useState(!order);
  const [error, setError] = useState<string | null>(null);
  const rememberOrderRef = useRef(rememberOrder);

  useEffect(() => {
    rememberOrderRef.current = rememberOrder;
  }, [rememberOrder]);

  useEffect(() => {
    if (hydrated && !session) {
      router.replace(appRoutes.login);
    }
  }, [hydrated, router, session]);

  useEffect(() => {
    const cachedOrder =
      recentOrders.find((candidate) => candidate.id === orderId) ?? null;

    if (cachedOrder) {
      setOrder(cachedOrder);
      setLoading(false);
      setError(null);
      return;
    }

    if (!session || !orderId) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    void getOrders(session.accessToken)
      .then((loadedOrders) => {
        if (!active) {
          return;
        }

        const matchedOrder =
          loadedOrders.find((candidate) => candidate.id === orderId) ?? null;

        if (!matchedOrder) {
          setError("Заказ не найден.");
          setOrder(null);
          return;
        }

        setOrder(matchedOrder);
        rememberOrderRef.current(matchedOrder);
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Не удалось загрузить заказ.",
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
  }, [orderId, recentOrders, session]);

  return (
    <MobileAppFrame>
      <div className="px-[15px] pb-6 pt-[2px]">
        {!hydrated || !session ? (
          <div className="mt-4 flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[#1688ff]" />
          </div>
        ) : loading ? (
          <div className="mt-4 flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[#1688ff]" />
          </div>
        ) : error ? (
          <StatusCard
            description={error}
            title="Не удалось открыть заказ"
            tone="error"
          />
        ) : order ? (
          <div className="space-y-3">
            <OrderOverviewCard
              onRepeat={() => {
                replaceCartFromOrder(order);
                startTransition(() => {
                  router.push(appRoutes.cart);
                });
              }}
              order={order}
            />
            <OrderItemsCard order={order} />
          </div>
        ) : null}
      </div>
    </MobileAppFrame>
  );
}

function StatusCard({
  description,
  title,
  tone = "default",
}: {
  description: string;
  title: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={[
        "mt-4 rounded-[28px] px-4 py-5 text-center shadow-[0_2px_25px_rgba(0,0,0,0.16)]",
        tone === "error" ? "bg-[#fff2f2] text-[#bf4d4d]" : "bg-white text-[#121212]",
      ].join(" ")}
    >
      <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px]">{title}</p>
      <p
        className={[
          "mt-2 text-[13px] leading-[18px] tracking-[-0.08px]",
          tone === "error" ? "text-[#bf4d4d]" : "text-[#8e8e93]",
        ].join(" ")}
      >
        {description}
      </p>
    </div>
  );
}

function OrderOverviewCard({
  onRepeat,
  order,
}: {
  onRepeat: () => void;
  order: Order;
}) {
  const tone = formatOrderStatusTone(order.statusId);

  return (
    <section className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_2px_25px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
            Заказ №{order.id}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-[#8e8e93]">
            {formatOrderDateTime(order.dateInsert)}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-[#8e8e93]">
            Кол-во позиций: {getOrderItemCount(order)} шт.
          </p>
        </div>

        <div className="min-w-[100px] text-right">
          <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
            {formatOrderMoney(order.price, order.currency)}
          </p>
          <p
            className={[
              "mt-0.5 text-[12px] leading-4",
              tone === "success"
                ? "text-[#34c759]"
                : tone === "danger"
                  ? "text-[#ff383c]"
                  : "text-[#8e8e93]",
            ].join(" ")}
          >
            {formatOrderStatusLabel(order.statusId)}
          </p>
        </div>
      </div>

      <div className="mx-2 mt-3 h-px bg-[#e6e6e6]" />

      <div className="mt-3 flex justify-center gap-6">
        <OrderActionButton label="Повторить" onClick={onRepeat}>
          <svg
            aria-hidden="true"
            className="size-7"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12a8.5 8.5 0 1 1-2.17-5.7M17.83 4.5L21.5 8.2H17.83"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </OrderActionButton>

        <OrderActionButton href={supportPhoneHref} label="Поддержка">
          <svg
            aria-hidden="true"
            className="size-7"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7 8.75A2.75 2.75 0 0 1 9.75 6h4.5A2.75 2.75 0 0 1 17 8.75v4.5A2.75 2.75 0 0 1 14.25 16H12l-3.4 2.55A.75.75 0 0 1 7.4 18V16A2.75 2.75 0 0 1 7 13.25v-4.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.25 10.25h3.5M10.25 13.25h2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </OrderActionButton>
      </div>
    </section>
  );
}

function OrderItemsCard({ order }: { order: Order }) {
  return (
    <section className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_2px_25px_rgba(0,0,0,0.16)]">
      <p className="text-center text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
        Состав заказа
      </p>

      <div className="mt-4">
        {order.items.map((item, index) => (
          <div key={item.id}>
            {index > 0 ? <div className="mx-1 h-px bg-[#e6e6e6]" /> : null}
            <OrderItemRow item={item} order={order} />
          </div>
        ))}
      </div>
    </section>
  );
}

function OrderItemRow({
  item,
  order,
}: {
  item: Order["items"][number];
  order: Order;
}) {
  const imageUrl = resolveAssetUrl(item.imageUrl) ?? orderItemFallbackSrc;

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-[6px]">
        <div className="relative h-7 w-[35px] overflow-hidden rounded-[6px] bg-[#f2f2f7]">
          <Image
            src={imageUrl}
            alt={item.productName}
            fill
            sizes="35px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#121212]">
            {item.productName}
          </p>
          <p className="text-[11px] leading-[13px] tracking-[0.01em] text-[#121212]">
            {item.quantity} шт
          </p>
        </div>
      </div>

      <div className="min-w-[79px] text-right">
        <p className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#121212]">
          {formatOrderMoney(item.price * item.quantity, order.currency)}
        </p>
        <p className="text-[11px] leading-[13px] tracking-[0.01em] text-[#8e8e93]">
          {formatOrderMoney(item.price, order.currency)} / шт
        </p>
      </div>
    </div>
  );
}

function OrderActionButton({
  children,
  href,
  label,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  label: string;
  onClick?: () => void;
}) {
  const className = "flex flex-col items-center gap-1.5 text-[#1688ff]";
  const content = (
    <>
      <span className="inline-flex size-11 items-center justify-center rounded-full bg-[rgba(118,118,128,0.12)] p-2">
        {children}
      </span>
      <span className="font-['SF_Pro:Regular',sans-serif] text-[12px] leading-4 font-normal text-[#8e8e93]">
        {label}
      </span>
    </>
  );

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
