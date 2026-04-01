"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/button";
import { MobileAppFrame } from "@/components/mobile-app-frame";
import { QuantityControl } from "@/components/quantity-control";
import { appRoutes } from "@/lib/app-routes";
import {
  getOrderById,
  getProducts,
  type Order,
  type Product,
  updateOrder,
} from "@/lib/api";
import {
  addProductToOrderEditDraft,
  createOrderEditDraft,
  getOrderEditDraftItemCount,
  getOrderEditDraftTotal,
  getOrderEditDraftValidationError,
  isOrderEditable,
  removeProductFromOrderEditDraft,
  syncOrderEditDraftWithCatalogProducts,
  toUpdateOrderPayload,
  updateOrderEditDraftItemQuantity,
  type OrderEditDraft,
} from "@/lib/order-edit-draft";
import { createOrderAddressDraft } from "@/lib/order-draft";
import {
  formatOrderDateTime,
  formatOrderMoney,
  formatOrderStatusLabel,
  formatOrderStatusTone,
  getOrderItemCount,
} from "@/lib/profile-presentation";
import { selectHomeProducts } from "@/lib/home-products";
import { resolveProductImageUrl } from "@/lib/product-image";
import {
  decrementQuantity,
  incrementQuantity,
  canIncrementQuantity,
  formatPricePerUnit,
  formatQuantity,
} from "@/lib/product-units";
import { useAppStore } from "@/lib/app-store";

const supportPhoneHref = "tel:+996705275206";
const ORDER_BECAME_READONLY_MESSAGE = "This order can no longer be edited";

export default function OrderDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";
  const { hydrated, recentOrders, rememberOrder, replaceCartFromOrder, session } =
    useAppStore();
  const [order, setOrder] = useState<Order | null>(() => {
    return recentOrders.find((candidate) => candidate.id === orderId) ?? null;
  });
  const [draft, setDraft] = useState<OrderEditDraft | null>(() => {
    const cachedOrder = recentOrders.find((candidate) => candidate.id === orderId);
    return cachedOrder ? createOrderEditDraft(cachedOrder) : null;
  });
  const [loading, setLoading] = useState(!order);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [reloadToken, setReloadToken] = useState(0);
  const rememberOrderRef = useRef(rememberOrder);
  const recentOrdersRef = useRef(recentOrders);

  useEffect(() => {
    rememberOrderRef.current = rememberOrder;
  }, [rememberOrder]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    recentOrdersRef.current = recentOrders;
  }, [recentOrders]);

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
      setDraft((current) => current ?? createOrderEditDraft(cachedOrder));
      setLoading(false);
      setLoadError(null);
    }
  }, [orderId, recentOrders]);

  useEffect(() => {
    if (!session || !orderId) {
      return;
    }

    let active = true;
    const hasCachedOrder = recentOrdersRef.current.some(
      (candidate) => candidate.id === orderId,
    );

    if (!hasCachedOrder) {
      setLoading(true);
    }
    setLoadError(null);

    void getOrderById(orderId, session.accessToken)
      .then((loadedOrder) => {
        if (!active) {
          return;
        }

        setOrder(loadedOrder);
        rememberOrderRef.current(loadedOrder);
      })
      .catch((loadOrderError) => {
        if (!active) {
          return;
        }

        setLoadError(
          loadOrderError instanceof Error
            ? loadOrderError.message
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
  }, [orderId, reloadToken, session]);

  useEffect(() => {
    if (!order || isEditing) {
      return;
    }

    setDraft(createOrderEditDraft(order));
  }, [isEditing, order]);

  const canEdit = order ? isOrderEditable(order, new Date(nowTick)) : false;

  useEffect(() => {
    if (!order || !isEditing || canEdit) {
      return;
    }

    setIsEditing(false);
    setSaveError("Заказ больше нельзя редактировать.");
  }, [canEdit, isEditing, order]);

  useEffect(() => {
    setCatalogProducts([]);
    setCatalogLoading(false);
    setCatalogLoaded(false);
    setCatalogError(null);
  }, [orderId, session?.accessToken]);

  useEffect(() => {
    if (
      !isEditing
      || !session
      || catalogLoaded
      || catalogError
    ) {
      return;
    }

    let active = true;

    setCatalogLoading(true);
    setCatalogError(null);

    void getProducts({})
      .then((loadedProducts) => {
        if (!active) {
          return;
        }

        setCatalogProducts(selectHomeProducts(loadedProducts));
        setCatalogLoaded(true);
      })
      .catch((loadProductsError) => {
        if (!active) {
          return;
        }

        setCatalogError(
          loadProductsError instanceof Error
            ? loadProductsError.message
            : "Не удалось загрузить каталог.",
        );
      })
      .finally(() => {
        if (active) {
          setCatalogLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [catalogError, catalogLoaded, isEditing, session]);

  useEffect(() => {
    if (!isEditing || !catalogProducts.length) {
      return;
    }

    setDraft((current) =>
      current ? syncOrderEditDraftWithCatalogProducts(current, catalogProducts) : current,
    );
  }, [catalogProducts, isEditing]);

  const validationError = draft ? getOrderEditDraftValidationError(draft) : null;
  const total = draft && isEditing ? getOrderEditDraftTotal(draft) : order?.price ?? 0;
  const itemCount =
    draft && isEditing ? getOrderEditDraftItemCount(draft) : order ? getOrderItemCount(order) : 0;
  const productAvailability = new Map(catalogProducts.map((product) => [product.id, product]));

  async function handleSave() {
    if (!session || !order || !draft) {
      return;
    }

    if (!isOrderEditable(order)) {
      setSaveError("Заказ больше нельзя редактировать.");
      setIsEditing(false);
      return;
    }

    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const updatedOrder = await updateOrder(
        order.id,
        toUpdateOrderPayload(draft),
        session.accessToken,
      );

      setOrder(updatedOrder);
      rememberOrder(updatedOrder);
      setDraft(createOrderEditDraft(updatedOrder));
      setIsEditing(false);
    } catch (updateOrderError) {
      const message =
        updateOrderError instanceof Error
          ? updateOrderError.message
          : "Не удалось сохранить изменения.";

      if (message.includes(ORDER_BECAME_READONLY_MESSAGE)) {
        setSaveError("Заказ больше нельзя редактировать.");
        setIsEditing(false);
        setReloadToken((current) => current + 1);
      } else {
        setSaveError(message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartEdit() {
    if (!order) {
      return;
    }

    if (!isOrderEditable(order)) {
      setSaveError("Заказ больше нельзя редактировать.");
      return;
    }

    setDraft(createOrderEditDraft(order));
    setCatalogError(null);
    setSaveError(null);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    if (!order) {
      return;
    }

    setDraft(createOrderEditDraft(order));
    setSaveError(null);
    setIsEditing(false);
  }

  return (
    <MobileAppFrame>
      <div className="px-[15px] pb-6 pt-[2px]">
        {!hydrated || !session ? (
          <LoadingState />
        ) : loading && !order ? (
          <LoadingState />
        ) : loadError && !order ? (
          <StatusCard
            description={loadError}
            title="Не удалось открыть заказ"
            tone="error"
          />
        ) : order ? (
          <div className="space-y-3">
            {loadError ? (
              <InlineNotice tone="error">{loadError}</InlineNotice>
            ) : null}

            <OrderOverviewCard
              canEdit={canEdit}
              isEditing={isEditing}
              itemCount={itemCount}
              onCancelEdit={handleCancelEdit}
              onEdit={handleStartEdit}
              onRepeat={() => {
                replaceCartFromOrder(order);
                startTransition(() => {
                  router.push(appRoutes.cart);
                });
              }}
              order={order}
              total={total}
            />

            {isEditing && draft ? (
              <>
                <OrderEditFieldsCard
                  draft={draft}
                  onCommentsChange={(comments) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            comments,
                          }
                        : current,
                    )
                  }
                  onNameChange={(orderedByFullName) =>
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            orderedByFullName,
                          }
                        : current,
                    )
                  }
                />

                <EditableOrderItemsCard
                  draft={draft}
                  productAvailability={productAvailability}
                  onQuantityChange={(productId, quantity) =>
                    setDraft((current) =>
                      current
                        ? updateOrderEditDraftItemQuantity(current, productId, quantity)
                        : current,
                    )
                  }
                  onRemove={(productId) =>
                    setDraft((current) =>
                      current ? removeProductFromOrderEditDraft(current, productId) : current,
                    )
                  }
                />

                <OrderCatalogCard
                  draft={draft}
                  error={catalogError}
                  loading={catalogLoading}
                  products={catalogProducts}
                  onAdd={(product) =>
                    setDraft((current) => {
                      if (!current) {
                        return current;
                      }

                      const currentQuantity =
                        current.items.find((item) => item.productId === product.id)?.quantity ?? 0;

                      if (!product.available || currentQuantity >= product.quantity) {
                        return current;
                      }

                      return addProductToOrderEditDraft(current, product);
                    })
                  }
                />

                <EditFooter
                  currency={draft.currency}
                  disabled={Boolean(validationError) || isSaving}
                  error={saveError ?? validationError}
                  isSaving={isSaving}
                  itemCount={itemCount}
                  onSubmit={handleSave}
                  total={total}
                />
              </>
            ) : (
              <OrderItemsCard order={order} />
            )}
          </div>
        ) : null}
      </div>
    </MobileAppFrame>
  );
}

function LoadingState() {
  return (
    <div className="mt-4 flex justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#d9d9de] border-t-[#1688ff]" />
    </div>
  );
}

function InlineNotice({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={[
        "rounded-[20px] px-4 py-3 text-[13px] leading-[18px] tracking-[-0.08px]",
        tone === "error"
          ? "bg-[#fff2f2] text-[#bf4d4d]"
          : "bg-[#eef5ff] text-[#2563a6]",
      ].join(" ")}
    >
      {children}
    </div>
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
  canEdit,
  isEditing,
  itemCount,
  onCancelEdit,
  onEdit,
  onRepeat,
  order,
  total,
}: {
  canEdit: boolean;
  isEditing: boolean;
  itemCount: number;
  onCancelEdit: () => void;
  onEdit: () => void;
  onRepeat: () => void;
  order: Order;
  total: number;
}) {
  const tone = formatOrderStatusTone(order.statusId);

  return (
    <section className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_2px_25px_rgba(0,0,0,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
              Заказ №{order.id}
            </p>
            {isEditing ? (
              <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 text-[11px] leading-[13px] font-medium tracking-[-0.08px] text-[#1688ff]">
                Редактирование
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[12px] leading-4 text-[#8e8e93]">
            {formatOrderDateTime(order.dateInsert)}
          </p>
          <p className="mt-0.5 text-[12px] leading-4 text-[#8e8e93]">
            Кол-во позиций: {itemCount}
          </p>
        </div>

        <div className="min-w-[100px] text-right">
          <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
            {formatOrderMoney(total, order.currency)}
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
        {canEdit ? (
          <OrderActionButton
            label={isEditing ? "Отменить" : "Редактировать"}
            onClick={isEditing ? onCancelEdit : onEdit}
          >
            {isEditing ? <CloseCircleIcon /> : <EditCircleIcon />}
          </OrderActionButton>
        ) : (
          <OrderActionButton label="Повторить" onClick={onRepeat}>
            <RepeatCircleIcon />
          </OrderActionButton>
        )}

        <OrderActionButton href={supportPhoneHref} label="Поддержка">
          <SupportCircleIcon />
        </OrderActionButton>
      </div>
    </section>
  );
}

function OrderEditFieldsCard({
  draft,
  onCommentsChange,
  onNameChange,
}: {
  draft: OrderEditDraft;
  onCommentsChange: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  const address = draft.address ? createOrderAddressDraft(draft.address) : null;

  return (
    <section className="rounded-[28px] bg-[#f7f8fb] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <p className="text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-[#121212]">
        Данные заказа
      </p>
      <p className="mt-1 text-[13px] leading-[18px] tracking-[-0.08px] text-[#8e8e93]">
        Можно изменить состав заказа, ФИО и комментарий. Адрес после оформления
        фиксируется.
      </p>

      <div className="mt-4 rounded-[22px] border border-[#ececf2] bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
              Адрес доставки
            </p>
            <p className="mt-1 text-[12px] leading-4 tracking-[-0.08px] text-[#8e8e93]">
              После оформления адрес больше не редактируется.
            </p>
          </div>
          <span className="rounded-full bg-[#f2f3f7] px-3 py-1 text-[11px] leading-[13px] font-medium tracking-[-0.08px] text-[#8e8e93]">
            read-only
          </span>
        </div>

        <p className="mt-4 text-[15px] leading-5 tracking-[-0.23px] text-[#121212]">
          {address
            ? formatAddressPreview(address)
            : "Адрес доставки не был сохранен в заказе."}
        </p>
      </div>

      <label className="mt-4 block">
        <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
          ФИО оформляющего
        </span>
        <input
          value={draft.orderedByFullName}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Например, Иван Иванов"
          className="mt-2 w-full rounded-[18px] border border-[#ececf2] bg-white px-4 py-3 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#1a1a1f]">
          Комментарий
        </span>
        <textarea
          value={draft.comments}
          onChange={(event) => onCommentsChange(event.target.value)}
          placeholder="Пожелания по заявке"
          className="mt-2 min-h-[108px] w-full resize-none rounded-[22px] border border-[#ececf2] bg-white px-4 py-3 text-[15px] leading-5 tracking-[-0.23px] text-[#121212] outline-none transition focus:border-[#1688ff] focus:ring-4 focus:ring-[#1688ff]/10"
        />
      </label>
    </section>
  );
}

function EditableOrderItemsCard({
  draft,
  productAvailability,
  onQuantityChange,
  onRemove,
}: {
  draft: OrderEditDraft;
  productAvailability: Map<string, Product>;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <section className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_2px_25px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
          Состав заказа
        </p>
        <span className="text-[12px] leading-4 text-[#8e8e93]">
          {draft.items.length} позиций
        </span>
      </div>

      <div className="mt-4">
        {draft.items.map((item, index) => {
          const product = productAvailability.get(item.productId);
          const canIncrement = Boolean(
            product
              && product.available
              && canIncrementQuantity(item.quantity, product.quantity, item.unit),
          );

          return (
            <div key={item.productId}>
              {index > 0 ? <div className="mx-1 h-px bg-[#e6e6e6]" /> : null}
              <EditableOrderItemRow
                badge={
                  !product
                    ? "Не в каталоге"
                    : product.available
                      ? "В наличии"
                      : "Нет в наличии"
                }
                canIncrement={canIncrement}
                item={item}
                onChange={(quantity) => onQuantityChange(item.productId, quantity)}
                onDecrement={() =>
                  onQuantityChange(item.productId, decrementQuantity(item.quantity, item.unit))
                }
                onIncrement={() => {
                  if (!canIncrement) {
                    return;
                  }

                  onQuantityChange(item.productId, incrementQuantity(item.quantity, item.unit));
                }}
                onRemove={() => onRemove(item.productId)}
                tone={!product || !product.available ? "muted" : "success"}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EditableOrderItemRow({
  badge,
  canIncrement,
  onChange,
  item,
  onDecrement,
  onIncrement,
  onRemove,
  tone,
}: {
  badge: string;
  canIncrement: boolean;
  onChange: (quantity: number) => void;
  item: OrderEditDraft["items"][number];
  onDecrement: () => void;
  onIncrement: () => void;
  onRemove: () => void;
  tone: "success" | "muted";
}) {
  const imageUrl = resolveProductImageUrl(item.imageUrl);

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-[10px]">
          <div className="relative h-10 w-10 overflow-hidden rounded-[10px] bg-[#f2f2f7]">
            <Image
              src={imageUrl}
              alt={item.productName}
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#121212]">
              {item.productName}
            </p>
            <p
              className={[
                "mt-1 text-[11px] leading-[13px] tracking-[0.01em]",
                tone === "success" ? "text-[#4d8a32]" : "text-[#8e8e93]",
              ].join(" ")}
            >
              {badge}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <QuantityControl
            incrementDisabled={!canIncrement}
            onChange={onChange}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            quantity={item.quantity}
            unit={item.unit}
          />
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[13px] font-semibold text-[#ff383c] transition hover:bg-[#fff4f4]"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderCatalogCard({
  draft,
  error,
  loading,
  onAdd,
  products,
}: {
  draft: OrderEditDraft;
  error: string | null;
  loading: boolean;
  onAdd: (product: Product) => void;
  products: Product[];
}) {
  return (
    <section className="rounded-[28px] bg-white px-3 pb-3 pt-3 shadow-[0_2px_25px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] leading-5 font-semibold tracking-[-0.23px] text-[#121212]">
            Добавить товары
          </p>
          <p className="mt-1 text-[12px] leading-4 text-[#8e8e93]">
            Каталог встроен в экран заказа, без перехода в корзину.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={`order-catalog-skeleton-${index}`}
              className="rounded-[24px] bg-[#f7f8fb] px-3 py-3"
            >
              <div className="h-[84px] animate-pulse rounded-[18px] bg-[#eef2f7]" />
              <div className="mt-3 h-4 animate-pulse rounded-full bg-[#eef2f7]" />
              <div className="mt-2 h-8 animate-pulse rounded-full bg-[#eef2f7]" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-[20px] bg-[#fff2f2] px-4 py-3 text-[13px] leading-[18px] tracking-[-0.08px] text-[#bf4d4d]">
          {error}
        </div>
      ) : products.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {products.map((product) => {
            const quantityInDraft =
              draft.items.find((item) => item.productId === product.id)?.quantity ?? 0;
            const canAdd =
              product.available
              && canIncrementQuantity(quantityInDraft, product.quantity, product.unit);

            return (
              <CatalogProductCard
                key={product.id}
                canAdd={canAdd}
                product={product}
                quantityInDraft={quantityInDraft}
                onAdd={() => onAdd(product)}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-[20px] bg-[#f7f8fb] px-4 py-3 text-[13px] leading-[18px] tracking-[-0.08px] text-[#8e8e93]">
          Подходящие товары для добавления пока недоступны.
        </div>
      )}
    </section>
  );
}

function CatalogProductCard({
  canAdd,
  onAdd,
  product,
  quantityInDraft,
}: {
  canAdd: boolean;
  onAdd: () => void;
  product: Product;
  quantityInDraft: number;
}) {
  const imageUrl = resolveProductImageUrl(product.picture);

  return (
    <article className="rounded-[24px] bg-[#f7f8fb] px-3 pb-3 pt-3">
      <div className="flex h-[84px] items-center justify-center rounded-[18px] bg-white">
        <Image
          src={imageUrl}
          alt={product.name}
          width={76}
          height={76}
          sizes="76px"
          className="h-[72px] w-[72px] object-contain"
        />
      </div>

      <p className="mt-3 min-h-[36px] text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#121212]">
        {product.name}
      </p>
      <p className="mt-1 text-[11px] leading-[13px] tracking-[0.01em] text-[#8e8e93]">
        {quantityInDraft > 0 ? `В заказе: ${formatQuantity(quantityInDraft, product.unit)}` : "Еще не добавлен"}
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className={[
          "mt-3 flex h-8 w-full items-center justify-center rounded-full text-[13px] font-semibold transition",
          canAdd
            ? "bg-[#1688ff] text-white active:scale-[0.99]"
            : "bg-[#ececf1] text-[#9aa0ab]",
        ].join(" ")}
      >
        {canAdd ? "Добавить" : product.available ? "Лимит" : "Нет в наличии"}
      </button>
    </article>
  );
}

function EditFooter({
  currency,
  disabled,
  error,
  isSaving,
  itemCount,
  onSubmit,
  total,
}: {
  currency: string;
  disabled: boolean;
  error: string | null;
  isSaving: boolean;
  itemCount: number;
  onSubmit: () => void;
  total: number;
}) {
  return (
    <div className="rounded-[28px] border border-[#f0f1f5] bg-white px-4 pb-4 pt-3 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] leading-4 text-[#8e8e93]">После сохранения</p>
          <p className="mt-1 text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-[#121212]">
            {formatOrderMoney(total, currency)}
          </p>
        </div>
        <span className="text-[12px] leading-4 text-[#8e8e93]">{itemCount} поз.</span>
      </div>

      {error ? (
        <div className="mb-3 rounded-[16px] bg-[#fff2f2] px-4 py-3 text-[13px] leading-[18px] tracking-[-0.08px] text-[#bf4d4d]">
          {error}
        </div>
      ) : null}

      <Button
        className="w-full"
        disabled={disabled}
        onClick={onSubmit}
      >
        {isSaving ? "Сохраняем изменения..." : "Сохранить изменения"}
      </Button>
    </div>
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
  const imageUrl = resolveProductImageUrl(item.imageUrl);

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
            {formatQuantity(item.quantity, item.unit)}
          </p>
        </div>
      </div>

      <div className="min-w-[79px] text-right">
        <p className="text-[13px] leading-[18px] font-semibold tracking-[-0.08px] text-[#121212]">
          {formatOrderMoney(item.price * item.quantity, order.currency)}
        </p>
        <p className="text-[11px] leading-[13px] tracking-[0.01em] text-[#8e8e93]">
          {formatPricePerUnit(formatOrderMoney(item.price, order.currency), item.unit)}
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

function RepeatCircleIcon() {
  return (
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
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function EditCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-7"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 20h4l9.5-9.5a1.8 1.8 0 0 0 0-2.55l-1.45-1.45a1.8 1.8 0 0 0-2.55 0L4 16v4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="m12.5 7.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

function CloseCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-7"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m8 8 8 8M16 8l-8 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SupportCircleIcon() {
  return (
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
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path
        d="M10.25 10.25h3.5M10.25 13.25h2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
