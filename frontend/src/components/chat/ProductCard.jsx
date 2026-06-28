import { useNavigate } from "react-router-dom";
import { ChevronRight, Check } from "lucide-react";

const PLACEHOLDER_IMG = "https://via.placeholder.com/300x200?text=NPH+Store";

const formatPrice = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "Liên hệ";
  return num.toLocaleString("vi-VN") + "₫";
};

/**
 * Thẻ sản phẩm trong khung chat.
 *
 * Nhận dữ liệu CÓ CẤU TRÚC từ backend (không parse text, không regex link):
 * { id, name, price, oldPrice, image, url, category, highlights }
 *
 * Click ảnh / tên / nút "Xem chi tiết" -> điều hướng tới /product/:id.
 */
export default function ProductCard({ product, onNavigate }) {
  const navigate = useNavigate();
  if (!product) return null;

  const {
    id,
    name,
    price,
    oldPrice,
    image,
    category,
    highlights = [],
  } = product;

  const hasDiscount =
    oldPrice != null && Number(oldPrice) > Number(price) && Number(price) > 0;
  const discountPercent = hasDiscount
    ? Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100)
    : 0;

  const goToDetail = () => {
    if (!id) return;
    navigate(`/product/${id}`);
    onNavigate?.();
  };

  return (
    <div className="group flex w-[200px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={goToDetail}
        aria-label={`Xem chi tiết ${name}`}
        className="relative block h-36 w-full overflow-hidden bg-gray-50"
      >
        <img
          src={image || PLACEHOLDER_IMG}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER_IMG;
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {discountPercent > 0 && (
          <span className="absolute right-0 top-0 z-10 rounded-bl-lg bg-red-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm">
            -{discountPercent}%
          </span>
        )}
        {category && (
          <span className="absolute left-2 top-2 z-10 max-w-[70%] truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {category}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-3">
        <button type="button" onClick={goToDetail} className="text-left">
          <h4 className="mb-1.5 line-clamp-2 min-h-[2.5em] text-[13px] font-semibold leading-snug text-gray-800 transition-colors hover:text-blue-600">
            {name}
          </h4>
        </button>

        <div className="mb-2 flex flex-wrap items-end gap-x-2">
          <span className="text-[15px] font-bold leading-none text-red-600">
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <span className="text-[11px] text-gray-400 line-through">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        {highlights.length > 0 && (
          <ul className="mb-3 space-y-1">
            {highlights.slice(0, 3).map((highlight, index) => (
              <li
                key={index}
                className="flex items-start gap-1 text-[11px] leading-snug text-gray-600"
              >
                <Check size={12} className="mt-0.5 shrink-0 text-green-500" />
                <span className="line-clamp-1">{highlight}</span>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={goToDetail}
          className="mt-auto flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
        >
          Xem chi tiết
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
