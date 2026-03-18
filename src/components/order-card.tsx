import Link from "next/link";
import { getOrderDetailsRoute } from "@/lib/app-routes";
import type { Order } from "@/lib/api";

const statusMap: Record<string, string> = {
  N: "Новый",
  P: "В обработке",
  S: "Отправлен",
  D: "Доставлен",
  C: "Отменен",
};

export function OrderCard({
  order,
  onRepeat,
}: {
  order: Order;
  onRepeat: () => void;
}) {
  return (
    <article className="panel">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--primary)]">
              #{order.id.slice(0, 8)}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--muted)]">
              {statusMap[order.statusId] ?? order.statusId}
            </span>
            {order.companyNameSnapshot ? (
              <span className="rounded-full bg-white px-3 py-1 text-xs text-[var(--muted)]">
                {order.companyNameSnapshot}
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-2xl font-semibold">
            {new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(order.dateInsert))}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Оформил: {order.orderedByFullName ?? "Не указан"} · Позиций:{" "}
            {order.items.reduce((total, item) => total + item.quantity, 0)}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href={getOrderDetailsRoute(order.id)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-white px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            Открыть заказ
          </Link>
          <button
            type="button"
            onClick={onRepeat}
            className="inline-flex flex-col items-center gap-1.5"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-[rgba(118,118,128,0.12)] p-2 text-[#1688ff]">
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
            </span>
            <span className="font-['SF_Pro:Regular',sans-serif] text-[12px] leading-4 font-normal text-[#8e8e93]">
              Повторить
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="rounded-[1.5rem] bg-[var(--surface-muted)] px-4 py-4"
          >
            <p className="text-sm font-semibold">{item.productName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              {item.quantity} шт.
            </p>
          </div>
        ))}
      </div>

      {order.comments ? (
        <div className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-white px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          {order.comments}
        </div>
      ) : null}
    </article>
  );
}
