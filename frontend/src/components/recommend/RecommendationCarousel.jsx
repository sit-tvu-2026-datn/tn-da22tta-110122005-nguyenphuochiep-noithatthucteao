import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Star } from "lucide-react";
import Cookies from "js-cookie";
import { message } from "antd";
import api from "../../config/api";
import { CartContext } from "../../context/CartContext";
import RecommendationSkeleton from "../RecommendationSkeleton";

// Chuyển động Framer Motion (đồng bộ với PersonalizedRecommendations)
const LUXURY_EASE = [0.22, 1, 0.36, 1];
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: LUXURY_EASE } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const MONEY_FORMATTER = new Intl.NumberFormat("vi-VN");
function formatMoney(value) {
  return `${MONEY_FORMATTER.format(Math.round(Number(value || 0)))}đ`;
}

function resolveImage(product) {
  if (product?.imageUrls?.length) return product.imageUrls[0];
  if (product?.imageUrl) return product.imageUrl;
  return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=90&w=600&auto=format&fit=crop";
}

/**
 * Section gợi ý tái sử dụng cho nhiều loại: Trending, Top Rated, Also Bought...
 *
 * @param {string}  title      Tiêu đề lớn của section
 * @param {string}  eyebrow    Dòng chữ nhỏ phía trên tiêu đề
 * @param {ReactNode} icon     Icon hiển thị cạnh eyebrow
 * @param {string}  endpoint   API endpoint trả về RecommendationResponse
 * @param {number}  limit      Số sản phẩm hiển thị (mặc định 4)
 * @param {boolean} showRating Hiển thị điểm đánh giá (dùng cho Top Rated)
 */
export default function RecommendationCarousel({
  title,
  eyebrow,
  icon = null,
  endpoint,
  limit = 4,
  showRating = false,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { refreshCartCount } = useContext(CartContext);
  const userId = Cookies.get("user_id");
  const token = Cookies.get("jwt");

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const separator = endpoint.includes("?") ? "&" : "?";
        const res = await api.get(`${endpoint}${separator}limit=${limit}`);
        if (mounted && res.data?.recommendations) {
          setRecommendations(res.data.recommendations);
        }
      } catch (error) {
        console.error(`Lỗi khi tải gợi ý (${endpoint}):`, error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [endpoint, limit]);

  const handleAddToCart = async (product) => {
    if (!token || !userId) {
      message.warning("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!");
      navigate("/login");
      return;
    }
    const finalPrice =
      product.discount > 0
        ? product.price * (1 - product.discount / 100)
        : product.price;

    const orderPayload = {
      userId,
      totalAmount: finalPrice,
      orderStatus: "pending",
      shippingAddress: "cart",
      isOrder: 0,
      orderDetails: [
        {
          product: { productId: product.productId },
          quantity: 1,
          unitPrice: finalPrice,
          originalUnitPrice: product.price,
          isFlashSale: 0,
        },
      ],
    };

    try {
      await api.post("/api/orders", orderPayload);
      message.success(`Đã thêm ${product.productName} vào giỏ hàng thành công!`);
      refreshCartCount(userId, token);
    } catch (err) {
      console.error("Lỗi thêm giỏ hàng:", err);
      message.error("Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng.");
    }
  };

  if (loading) {
    return <RecommendationSkeleton count={limit} />;
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="mx-auto max-w-[1420px] px-5 py-16 sm:px-8"
    >
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          {eyebrow && (
            <p className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-[0.32em] text-[#9a7d46]">
              {icon} {eyebrow}
            </p>
          )}
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] text-[#20201d] md:text-5xl">
            {title}
          </h2>
        </div>
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

          return (
            <motion.article
              key={product.productId}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              className="group overflow-hidden rounded-[1.75rem] border border-[#e1d7c9] bg-white/55 shadow-[0_18px_60px_rgba(74,58,39,0.08)] transition hover:border-[#ded4c5] hover:bg-white/45 backdrop-blur-md"
            >
              <Link to={`/product/${product.productId}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  <img
                    src={image}
                    alt={product.productName}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

                  {product.discount > 0 && (
                    <div className="absolute top-4 left-4 rounded-full bg-[#9a7d46] px-2.5 py-1 text-[10px] font-bold text-[#f8f6f2]">
                      -{product.discount}%
                    </div>
                  )}

                  {showRating && product.averageRating != null && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#5a4a2f] shadow">
                      <Star size={11} className="fill-[#e0b049] text-[#e0b049]" />
                      {product.averageRating}
                      {product.reviewCount != null && (
                        <span className="text-[#9c9285]">({product.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-5">
                <Link to={`/product/${product.productId}`} className="block">
                  <h3 className="min-h-12 text-lg font-light leading-snug text-[#25231f] transition group-hover:text-[#8a6d3b] line-clamp-2">
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
                    onClick={() => handleAddToCart(product)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#24231f] text-[#f8f6f2] transition hover:bg-[#c4aa75] hover:text-[#211f1b]"
                    aria-label="Thêm vào giỏ hàng"
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
