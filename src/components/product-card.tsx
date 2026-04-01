import Image from "next/image";
import { Button } from "@/components/button";
import { resolveAssetUrl, type Product } from "@/lib/api";

export function ProductCard({
  product,
  quantityInCart,
  onAdd,
  onRemove,
}: {
  product: Product;
  quantityInCart: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const imageUrl = resolveAssetUrl(product.picture);

  return (
    <article className="panel flex h-full flex-col overflow-hidden">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--surface-muted)]">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            width={640}
            height={480}
            unoptimized
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="aspect-[4/3] w-full bg-[radial-gradient(circle_at_top,_rgba(6,113,239,0.18),_transparent_58%),linear-gradient(135deg,_#f7fbff,_#dbeafe)]" />
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--muted)] shadow-sm">
          {product.category?.name ?? "Без категории"}
        </div>
      </div>

      <div className="mt-5 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{product.name}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {product.description || "Позиция доступна для корпоративного заказа."}
            </p>
          </div>
          <div
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              product.available
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700",
            ].join(" ")}
          >
            {product.available ? `В наличии: ${product.quantity}` : "Нет в наличии"}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--muted)]">
            Цена скрыта
          </div>
          {quantityInCart > 0 ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="h-10 px-4" onClick={onRemove}>
                -
              </Button>
              <div className="min-w-12 rounded-full bg-[var(--surface-muted)] px-4 py-2 text-center text-sm font-semibold">
                {quantityInCart}
              </div>
              <Button
                className="h-10 px-4"
                onClick={onAdd}
                disabled={!product.available || quantityInCart >= product.quantity}
              >
                +
              </Button>
            </div>
          ) : (
            <Button onClick={onAdd} disabled={!product.available}>
              В корзину
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
