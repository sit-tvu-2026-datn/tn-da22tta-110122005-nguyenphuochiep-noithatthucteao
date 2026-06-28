import ProductCard from "./ProductCard";

/**
 * Danh sách sản phẩm cuộn ngang trong khung chat.
 * Render trực tiếp các ProductCard từ mảng dữ liệu có cấu trúc của backend.
 */
export default function ProductCarousel({ products = [], onNavigate }) {
  const items = Array.isArray(products) ? products.filter(Boolean) : [];
  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
      {items.map((product, index) => (
        <ProductCard
          key={product.id || index}
          product={product}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
