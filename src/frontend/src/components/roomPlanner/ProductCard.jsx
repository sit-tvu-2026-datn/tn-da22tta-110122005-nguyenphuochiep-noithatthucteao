import { useState } from "react";
import { THEME, ON_PRIMARY } from "./theme";
import { getProductPriceInfo } from "../../utils/price";

/* ─────────────────── PRODUCT CARD ───────────────────
 *
 *  Vertical furniture-catalog card (IKEA / Planner5D / Homestyler style):
 *
 *    ┌─────────────────────────┐
 *    │        🛋️ Image         │  ← ~60% height, object-contain, centered
 *    ├─────────────────────────┤
 *    │ Ghế Sofa Nordic         │  ← name (16px / 600, ellipsis)
 *    │ Sofa                    │  ← category (muted)
 *    │ 4.500.000 đ             │  ← price (20px / 700, orange)
 *    │ [ + Thêm vào phòng ]    │  ← compact button
 *    └─────────────────────────┘
 *
 *  Pure presentational component — it only renders `product` and calls
 *  `onAdd(product)`. It knows nothing about Three.js / the scene.
 */

const formatVND = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

export default function ProductCard({ product, categoryName, onAdd }) {
  // Fall back to the placeholder when there's no image URL OR the URL 404s.
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(product.image) && !broken;

  // Giá hiển thị PHẢI khớp với bên ngoài: đã trừ giảm giá % (dùng chung công
  // thức với toàn hệ thống qua getProductPriceInfo).
  const { finalPrice, originalPrice, discountPercent } =
    getProductPriceInfo(product);
  const hasPrice = originalPrice > 0;
  const hasDiscount = discountPercent > 0 && finalPrice < originalPrice;

  return (
    <div
      className="group flex flex-col rounded-2xl border transition-all duration-[250ms] ease-out hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
      style={{ height: 340, background: THEME.panel, borderColor: THEME.border }}
    >
      {/* Image — ~60% of the card, contained + centred (never cropped) */}
      <div
        className="relative flex items-center justify-center overflow-hidden shrink-0"
        style={{ height: "60%", background: "#252525", borderRadius: "16px 16px 0 0" }}
      >
        {showImage ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setBroken(true)}
            className="max-w-full max-h-full object-contain transition-transform duration-[250ms] ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex flex-col items-center gap-1" style={{ color: THEME.secondary }}>
            <span className="text-4xl opacity-50">🛋️</span>
            <span className="text-[11px] opacity-60">Không có ảnh</span>
          </div>
        )}

        {/* Badge — top-left */}
        <span
          className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: THEME.primary, color: ON_PRIMARY }}
        >
          3D
        </span>

        {/* Discount badge — top-right */}
        {hasDiscount && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500 text-white">
            -{discountPercent}%
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 px-4 pt-3 pb-3.5">
        <div
          className="text-base font-semibold truncate"
          style={{ color: THEME.text }}
          title={product.name}
        >
          {product.name}
        </div>

        {categoryName && (
          <div className="text-[13px] truncate mt-0.5" style={{ color: THEME.secondary }}>
            {categoryName}
          </div>
        )}

        {/* Price + button pinned to the bottom of the card */}
        {hasPrice && (
          <div className="mt-auto flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-bold" style={{ color: THEME.primary }}>
              {formatVND(finalPrice)}
            </span>
            {hasDiscount && (
              <span
                className="text-[13px] line-through"
                style={{ color: THEME.secondary }}
              >
                {formatVND(originalPrice)}
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => onAdd(product)}
          className="mt-2 self-start rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[.97]"
          style={{ background: THEME.primary, color: ON_PRIMARY, padding: "9px 16px" }}
        >
          + Thêm vào phòng
        </button>
      </div>
    </div>
  );
}
