import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, ShoppingBag, Sparkles } from "lucide-react";
import api from "../config/api";
import RecommendationSkeleton from "./RecommendationSkeleton";

// Cấu hình chuyển động Framer Motion
const LUXURY_EASE = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: LUXURY_EASE } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// Định dạng tiền tệ
const MONEY_FORMATTER = new Intl.NumberFormat("vi-VN");
function formatMoney(value) {
  return `${MONEY_FORMATTER.format(Math.round(Number(value || 0)))}đ`;
}

// Xử lý ảnh đại diện
function resolveImage(product) {
  if (product?.imageUrls?.length) return product.imageUrls[0];
  if (product?.imageUrl) return product.imageUrl;
  return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=90&w=600&auto=format&fit=crop"; // fallback
}

/**
 * Section gợi ý sản phẩm tương tự phục vụ trên trang Chi tiết sản phẩm.
 * Sử dụng thuật toán gợi ý dựa trên nội dung (Content-Based Filtering).
 */
export default function SimilarProducts({ productId, onAddToCart }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!productId) return;

    const fetchSimilarProducts = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get(`/api/recommend/content/${productId}?limit=4`);
        if (res.data && res.data.recommendations) {
          setRecommendations(res.data.recommendations);
        } else {
          setRecommendations([]);
        }
      } catch (err) {
        console.error("Lỗi khi tải sản phẩm tương tự:", err);
        setError(true);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [productId]);

  // Nếu đang tải, hiển thị Skeleton
  if (loading) {
    return <RecommendationSkeleton count={4} />;
  }

  // Nếu lỗi hoặc không có sản phẩm gợi ý tương tự nào, ẩn toàn bộ section
  // Điều này cho phép RelatedProducts cũ làm fallback
  if (error || recommendations.length === 0) {
    return null;
  }

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mx-auto mt-24 max-w-7xl px-5 pb-28 sm:px-8 lg:pb-24"
    >
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-[#9a7d46]">
            <Sparkles size={12} className="text-[#c4aa75]" /> Thuật toán gợi ý
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] text-[#20201d] md:text-5xl">
            Sản phẩm tương tự
          </h2>
        </div>
        <Link
          to="/"
          className="group inline-flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#4b453d]"
        >
          Xem bộ sưu tập
          <ChevronRight size={16} className="transition group-hover:translate-x-1" />
        </Link>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {recommendations.map((product) => {
          const finalPrice =
            product.discount > 0
              ? product.price * (1 - product.discount / 100)
              : product.price;
          const image = resolveImage(product);
          const matchPercent = Math.round(product.similarityScore * 100);

          return (
            <motion.article
              key={product.productId}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/48 shadow-[0_18px_60px_rgba(74,58,39,0.08)] transition"
            >
              <Link to={`/product/${product.productId}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  <img
                    src={image}
                    alt={product.productName}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
                  
                  {/* Badge hiển thị độ tương đồng / độ phù hợp */}
                  <div className="absolute bottom-3 right-3 rounded-full bg-[#1f1f1d]/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#f8f6f2] backdrop-blur-md">
                    Phù hợp {matchPercent}%
                  </div>
                </div>
              </Link>
              <div className="p-5">
                <Link to={`/product/${product.productId}`} className="block">
                  <h3 className="min-h-12 text-lg font-light leading-snug text-[#25231f] transition group-hover:text-[#8a6d3b]">
                    {product.productName}
                  </h3>
                </Link>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#25231f]">
                      {formatMoney(finalPrice)}
                    </p>
                    {product.discount > 0 && (
                      <p className="text-xs text-[#9c9285] line-through">
                        {formatMoney(product.price)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddToCart(product, 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#24231f] text-[#f8f6f2] transition hover:bg-[#c4aa75] hover:text-[#211f1b]"
                    aria-label="Thêm sản phẩm tương tự vào giỏ hàng"
                  >
                    <ShoppingBag size={16} />
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </motion.section>
  );
}
