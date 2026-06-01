import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, ShoppingBag, Sparkles, UserCheck } from "lucide-react";
import Cookies from "js-cookie";
import { message } from "antd";
import api from "../config/api";
import { CartContext } from "../context/CartContext";
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
 * Section gợi ý cá nhân hóa dành riêng cho từng người dùng, hiển thị tại Trang Chủ (Home).
 * Sử dụng thuật toán kết hợp Hybrid (Lọc cộng tác kết hợp lọc nội dung) hoặc Fallback về phổ biến.
 */
export default function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState("");
  const [recType, setRecType] = useState("");
  
  const navigate = useNavigate();
  const { refreshCartCount } = useContext(CartContext);
  const userId = Cookies.get("user_id");
  const token = Cookies.get("jwt");

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        let responseData = null;

        // Nếu người dùng đã đăng nhập, thử lấy gợi ý Hybrid cá nhân hóa
        if (token && userId) {
          try {
            const res = await api.get(`/api/recommend/hybrid/${userId}?limit=4`);
            if (res.data && res.data.recommendations && res.data.recommendations.length > 0) {
              responseData = res.data;
            }
          } catch (err) {
            console.warn("Không lấy được gợi ý Hybrid, chuyển sang gợi ý phổ biến:", err);
          }
        }

        // Nếu chưa đăng nhập hoặc không lấy được gợi ý Hybrid, lấy sản phẩm phổ biến làm fallback
        if (!responseData) {
          const res = await api.get("/api/recommend/popular?limit=4");
          responseData = res.data;
        }

        if (responseData) {
          setRecommendations(responseData.recommendations || []);
          setApiMessage(responseData.message || "Gợi ý hàng đầu dành cho bạn");
          setRecType(responseData.recommendationType || "POPULAR");
        }
      } catch (error) {
        console.error("Lỗi khi tải gợi ý cá nhân hóa:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, token]);

  // Thêm vào giỏ hàng
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
    return <RecommendationSkeleton count={4} />;
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
          <p className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-[0.32em] text-[#9a7d46]">
            {recType === "HYBRID" || recType === "COLLABORATIVE" ? (
              <>
                <UserCheck size={12} className="text-[#c4aa75]" /> Dành riêng cho bạn
              </>
            ) : (
              <>
                <Sparkles size={12} className="text-[#c4aa75]" /> Xu hướng hiện tại
              </>
            )}
          </p>
          <h2 className="mt-3 text-3xl font-light tracking-[-0.02em] text-[#20201d] md:text-5xl">
            Gợi ý dành cho bạn
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
