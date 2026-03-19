"use client";

import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MobileAppFrame } from "@/components/mobile-app-frame";
import { appRoutes, getOrderDetailsRoute } from "@/lib/app-routes";
import { getOrders, type Order } from "@/lib/api";
import { useAppStore } from "@/lib/app-store";
import {
  formatOrderDateTime,
  formatOrderMoney,
  formatOrderStatusLabel,
  formatOrderStatusTone,
  getOrderItemCount,
} from "@/lib/profile-presentation";

type AccountTab = "profile" | "orders";

export function AccountScreen({ initialTab }: { initialTab: AccountTab }) {
  const router = useRouter();
  const { hydrated, orderDraft, recentOrders, saveProfile, session } = useAppStore();
  const [orders, setOrders] = useState<Order[]>(() => recentOrders);
  const [loading, setLoading] = useState(initialTab === "orders");
  const [error, setError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    orderedByFullName: "",
    phone: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !session) {
      router.replace(appRoutes.login);
    }
  }, [hydrated, router, session]);

  useEffect(() => {
    if (initialTab !== "orders") {
      setLoading(false);
      setError(null);
      return;
    }

    if (!session) {
      return;
    }

    let active = true;

    setLoading(true);
    setError(null);

    void getOrders(session.accessToken)
      .then((loadedOrders) => {
        if (active) {
          setOrders(loadedOrders);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Не удалось загрузить историю заказов.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [initialTab, session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    setProfileForm({
      orderedByFullName: orderDraft.orderedByFullName || session.user.name || "",
      phone: session.user.phone || "",
    });
  }, [orderDraft.orderedByFullName, session]);

  if (!hydrated || !session) {
    return (
      <MobileAppFrame>
        <div className="flex min-h-full items-center justify-center px-8 pb-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[#1688ff]" />
        </div>
      </MobileAppFrame>
    );
  }

  const initialProfileName =
    orderDraft.orderedByFullName.trim() || session.user.name?.trim() || "";
  const initialProfilePhone = session.user.phone?.trim() || "";
  const isProfileDirty =
    profileForm.orderedByFullName.trim() !== initialProfileName ||
    profileForm.phone.trim() !== initialProfilePhone;

  async function handleProfileSubmit() {
    if (!session || !isProfileDirty) {
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await saveProfile({
        name: profileForm.orderedByFullName.trim(),
        phone: profileForm.phone.trim(),
      });
      setProfileSuccess("Профиль обновлен.");
    } catch (saveError) {
      setProfileError(
        saveError instanceof Error ? saveError.message : "Не удалось сохранить профиль.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <MobileAppFrame>
      <div className="px-4 pb-6 pt-[2px]">
        <SegmentedControl
          activeTab={initialTab}
          onChange={(nextTab) => {
            if (nextTab === initialTab) {
              return;
            }

            startTransition(() => {
              router.push(nextTab === "profile" ? appRoutes.account : appRoutes.orders);
            });
          }}
        />

        {initialTab === "profile" ? (
          <ProfileFormCard
            companyName={session.user.companyName?.trim() || "Название организации"}
            error={profileError}
            form={profileForm}
            isDirty={isProfileDirty}
            isSaving={profileSaving}
            success={profileSuccess}
            onChange={(patch) => {
              setProfileSuccess(null);
              setProfileError(null);
              setProfileForm((current) => ({
                ...current,
                ...patch,
              }));
            }}
            onSubmit={handleProfileSubmit}
          />
        ) : (
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[#1688ff]" />
              </div>
            ) : error ? (
              <HistoryStatusCard
                title="Не удалось загрузить историю"
                description={error}
                tone="error"
              />
            ) : orders.length ? (
              orders.map((order) => <OrderHistoryCard key={order.id} order={order} />)
            ) : (
              <HistoryStatusCard
                title="История заказов пуста"
                description="После первой оформленной заявки заказы появятся в этом разделе."
              />
            )}
          </div>
        )}
      </div>
    </MobileAppFrame>
  );
}

function ProfileFormCard({
  companyName,
  error,
  form,
  isDirty,
  isSaving,
  success,
  onChange,
  onSubmit,
}: {
  companyName: string;
  error: string | null;
  form: {
    orderedByFullName: string;
    phone: string;
  };
  isDirty: boolean;
  isSaving: boolean;
  success: string | null;
  onChange: (patch: Partial<{ orderedByFullName: string; phone: string }>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-4 rounded-[28px] bg-white px-4 py-4 shadow-[0_2px_25px_rgba(0,0,0,0.14)]">
      <div className="space-y-4">
        <label className="block">
          <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
            Компания
          </span>
          <input
            value={companyName}
            readOnly
            className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-[#f5f5f7] px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#6b6b73] outline-none"
          />
        </label>

        <label className="block">
          <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
            ФИО оформляющего
          </span>
          <input
            value={form.orderedByFullName}
            onChange={(event) =>
              onChange({ orderedByFullName: event.target.value })
            }
            placeholder="Например, Иван Иванов"
            className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-[#ececec] px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
          />
        </label>

        <label className="block">
          <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
            Телефон
          </span>
          <input
            value={form.phone}
            onChange={(event) => onChange({ phone: event.target.value })}
            placeholder="+996 555 123 456"
            className="mt-2 h-[50px] w-full rounded-[18px] border border-[#ececf2] bg-[#ececec] px-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 text-[13px] leading-[18px] tracking-[-0.08px] text-[#d14343]">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-4 text-[13px] leading-[18px] tracking-[-0.08px] text-[#16884f]">
          {success}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isDirty || isSaving}
        className="mt-4 flex h-[50px] w-full items-center justify-center rounded-full bg-[#1688ff] px-5 text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-white disabled:cursor-not-allowed disabled:bg-[#9fcfff]"
      >
        {isSaving ? "Сохраняю..." : "Сохранить"}
      </button>
    </div>
  );
}

function SegmentedControl({
  activeTab,
  onChange,
}: {
  activeTab: AccountTab;
  onChange: (tab: AccountTab) => void;
}) {
  return (
    <div className="flex rounded-full bg-[rgba(118,118,128,0.12)] p-[2px]">
      <button
        type="button"
        onClick={() => onChange("profile")}
        className={[
          "flex h-7 flex-1 items-center justify-center rounded-full text-[13px] leading-[18px] tracking-[-0.08px] transition",
          activeTab === "profile"
            ? "bg-white font-semibold text-[#121212]"
            : "font-medium text-[#121212]",
        ].join(" ")}
      >
        Профиль
      </button>
      <button
        type="button"
        onClick={() => onChange("orders")}
        className={[
          "flex h-7 flex-1 items-center justify-center rounded-full text-[13px] leading-[18px] tracking-[-0.08px] transition",
          activeTab === "orders"
            ? "bg-white font-semibold text-[#121212]"
            : "font-medium text-[#121212]",
        ].join(" ")}
      >
        История
      </button>
    </div>
  );
}

function HistoryStatusCard({
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
        "rounded-[28px] px-4 py-5 shadow-[0_2px_25px_rgba(0,0,0,0.16)]",
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

function OrderHistoryCard({ order }: { order: Order }) {
  const tone = formatOrderStatusTone(order.statusId);

  return (
    <Link
      href={getOrderDetailsRoute(order.id)}
      className="block rounded-[28px] bg-white px-3 py-3 shadow-[0_2px_25px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.995]"
    >
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

        <div className="min-w-[92px] text-right">
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
    </Link>
  );
}
