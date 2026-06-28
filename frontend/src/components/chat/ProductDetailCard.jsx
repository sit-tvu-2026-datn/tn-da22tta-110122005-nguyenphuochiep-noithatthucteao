import { useNavigate } from "react-router-dom";
import { ChevronRight, CheckCircle2, XCircle } from "lucide-react";

const PLACEHOLDER_IMG = "https://via.placeholder.com/400x300?text=NPH+Store";

const formatPrice = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "Liên hệ";
  return num.toLocaleString("vi-VN") + "₫";
};

/**
 * Thẻ CHI TIẾT một sản phẩm trong khung chat (type = "product_detail").
 *
 * Hiển thị: ảnh, danh mục, tên, giá / giá cũ / badge giảm giá, tình trạng còn hàng,
 * mô tả, bảng thông số (specs: [{label, value}]) và nút "Xem chi tiết".
 * Dữ liệu lấy từ backend; click ảnh / tên / nút -> /product/:id.
 */
export default function ProductDetailCard({ product, onNavigate }) {
  const navigate = useNavigate();
  if (!product) return null;

  const {
    id,
    name,
    price,
    oldPrice,
    image,
    category,
    description,
    specs = [],
    inStock,
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
    <div className="mt-2 w-full max-w-[360px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={goToDetail}
        aria-label={`Xem chi tiết ${name}`}
        className="group relative block h-44 w-full overflow-hidden bg-gray-50"
      >
        <img
          src={image || PLACEHOLDER_IMG}
          alt={name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = PLACEHOLDER_IMG;
          }}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {discountPercent > 0 && (
          <span className="absolute right-0 top-0 z-10 rounded-bl-lg bg-red-600 px-2 py-1 text-[12px] font-bold text-white shadow-sm">
            -{discountPercent}%
          </span>
        )}
        {category && (
          <span className="absolute left-2 top-2 z-10 max-w-[70%] truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {category}
          </span>
        )}
      </button>

      <div className="p-3.5">
        <button type="button" onClick={goToDetail} className="text-left">
          <h4 className="mb-2 line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 transition-colors hover:text-blue-600">
            {name}
          </h4>
        </button>

        <div className="mb-2 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[18px] font-bold leading-none text-red-600">
            {formatPrice(price)}
          </span>
          {hasDiscount && (
            <span className="text-[12px] text-gray-400 line-through">
              {formatPrice(oldPrice)}
            </span>
          )}
        </div>

        {inStock != null && (
          <div
            className={`mb-3 inline-flex items-center gap-1 text-[12px] font-medium ${
              inStock ? "text-green-600" : "text-gray-400"
            }`}
          >
            {inStock ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {inStock ? "Còn hàng" : "Tạm hết hàng"}
          </div>
        )}

        {description && (
          <p className="mb-3 line-clamp-3 text-[12px] leading-relaxed text-gray-600">
            {description}
          </p>
        )}

        {specs.length > 0 && (
          <dl className="mb-3 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {specs.map((spec, index) => (
              <div
                key={index}
                className="flex items-start justify-between gap-3 px-2.5 py-1.5 text-[12px]"
              >
                <dt className="shrink-0 text-gray-500">{spec.label}</dt>
                <dd className="text-right font-medium text-gray-800">
                  {spec.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <button
          type="button"
          onClick={goToDetail}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-blue-600 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.98]"
        >
          Xem chi tiết sản phẩm
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
