import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Clock, ShoppingBag } from "lucide-react";
import Cookies from "js-cookie";
import { message } from "antd";
import api from "../../config/api";
import { CartContext } from "../../context/CartContext";

// Chuyển động Framer Motion (đồng bộ với RecommendationCarousel / PersonalizedRecommendations)
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

/* ---------- Đồng hồ đếm ngược (style sang trọng đồng bộ trang chủ) ---------- */
function CountdownTimer({ endDate }) {
  const calc = () => {
    const diff = +new Date(endDate) - +new Date();
    if (diff <= 0) return null;
    return {
      hours: Math.floor(diff / (1000 * 60 * 60)),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calc);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) {
    return (
      <span className="text-sm uppercase tracking-[0.2em] text-[#9c9285]">
        Đã kết thúc
      </span>
    );
  }

  const pad = (n) => String(n).padStart(2, "0");
  const boxClass =
    "flex h-12 w-12 items-center justify-center rounded-xl bg-[#24231f] text-lg font-medium tabular-nums text-[#f8f6f2]";

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#9a7d46]">
        <Clock size={14} /> Kết thúc sau
      </span>
      <div className="flex items-center gap-1.5">
        <div className={boxClass}>{pad(timeLeft.hours)}</div>
        <span className="text-[#9a7d46]">giờ</span>
        <div className={boxClass}>{pad(timeLeft.minutes)}</div>
        <span className="text-[#9a7d46]">phút</span>
        <div className={boxClass}>{pad(timeLeft.seconds)}</div>
        giây
      </div>
    </div>
  );
}

export default function FlashSaleSection() {
  const [flashSale, setFlashSale] = useState(null);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const { refreshCartCount } = useContext(CartContext);
  const userId = Cookies.get("user_id");
  const token = Cookies.get("jwt");

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [fsRes, prodRes] = await Promise.all([
          api.get("/api/flash-sales/current").catch(() => ({ data: null })),
          api.get("/api/products"),
        ]);
        if (!mounted) return;
        if (fsRes.data && fsRes.data.status === "Active") {
          setFlashSale(fsRes.data);
        }
        setProducts(prodRes.data || []);
      } catch (error) {
        console.error("Lỗi tải dữ liệu Flash Sale:", error);
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Ghép flash sale item với sản phẩm đầy đủ (cơ chế giống trang Sản phẩm) ---
  // DTO flash sale chỉ trả productId / flashSalePrice / quantity / soldCount,
  // nên cần join với /api/products để lấy tên, ảnh và giá gốc.
  const flashSaleList =
    flashSale?.items
      ?.filter((fsItem) => fsItem.soldCount < fsItem.quantity)
      ?.map((fsItem) => {
        const product = products.find(
          (p) => p.productId === fsItem.productId,
        );
        if (!product) return null;
        const discountPercent = Math.round(
          ((product.price - fsItem.flashSalePrice) / product.price) * 100,
        );
        const soldPercent = Math.min(
          100,
          Math.round((fsItem.soldCount / fsItem.quantity) * 100),
        );
        return { product, fsItem, discountPercent, soldPercent };
      })
      .filter(Boolean) || [];

  const handleBuyNow = async (entry) => {
    if (!token || !userId) {
      message.warning("Vui lòng đăng nhập để mua sản phẩm Flash Sale!");
      navigate("/login");
      return;
    }
    const { product, fsItem } = entry;
    if (fsItem.soldCount >= fsItem.quantity) {
      message.error("Sản phẩm Flash Sale này đã hết suất!");
      return;
    }

    const orderPayload = {
      userId,
      totalAmount: fsItem.flashSalePrice,
      orderStatus: "pending",
      shippingAddress: "cart",
      isOrder: 0,
      orderDetails: [
        {
          product: { productId: product.productId },
          quantity: 1,
          unitPrice: fsItem.flashSalePrice,
          originalUnitPrice: product.price,
          isFlashSale: 1,
        },
      ],
    };

    try {
      await api.post("/api/orders", orderPayload);
      message.success(`Đã thêm ${product.productName} vào giỏ hàng!`);
      refreshCartCount(userId, token);
    } catch {
      message.error("Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng.");
    }
  };

  if (!flashSale || flashSaleList.length === 0) return null;

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="mx-auto max-w-[1420px] px-5 py-16 sm:px-8"
    >
      {/* Header */}
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-[0.32em] text-[#9a7d46]">
            <Zap size={12} className="fill-[#c4aa75] text-[#c4aa75]" /> Ưu đãi có hạn
          </p>
          <h2 className="mt-3 text-3xl font-normal tracking-[-0.02em] text-[#20201d] md:text-5xl">
            {flashSale.name}
          </h2>
        </div>
        <CountdownTimer endDate={flashSale.endDate} />
      </div>

      {/* Grid sản phẩm */}
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {flashSaleList.map((entry) => {
          const { product, fsItem, discountPercent, soldPercent } = entry;
          const image = resolveImage(product);

          return (
            <motion.article
              key={product.productId}
              variants={fadeUp}
              whileHover={{ y: -8 }}
              className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-[#e1d7c9] bg-white/55 shadow-[0_18px_60px_rgba(74,58,39,0.08)] backdrop-blur-md transition hover:border-[#ded4c5] hover:bg-white/45"
            >
              <Link to={`/product/${product.productId}`} className="block">
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  <img
                    src={image}
                    alt={product.productName}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

                  {discountPercent > 0 && (
                    <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-[#9a7d46] px-2.5 py-1 text-[10px] font-bold text-[#f8f6f2]">
                      <Zap size={10} fill="currentColor" /> -{discountPercent}%
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex flex-1 flex-col p-5">
                <Link to={`/product/${product.productId}`} className="block">
                  <h3 className="min-h-12 text-lg font-normal leading-snug text-[#25231f] transition line-clamp-2 group-hover:text-[#8a6d3b]">
                    {product.productName}
                  </h3>
                </Link>

                {/* Thanh tiến trình đã bán */}
                <div className="mt-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#ece4d6]">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#c4aa75] to-[#9a7d46]"
                      style={{ width: `${soldPercent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#9c9285]">
                    {soldPercent >= 90
                      ? "Sắp cháy hàng"
                      : `Đã bán ${fsItem.soldCount}`}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#9a7d46]">
                      {formatMoney(fsItem.flashSalePrice)}
                    </p>
                    {discountPercent > 0 && (
                      <p className="text-xs text-[#9c9285] line-through">
                        {formatMoney(product.price)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBuyNow(entry)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#24231f] text-[#f8f6f2] transition hover:bg-[#c4aa75] hover:text-[#211f1b]"
                    aria-label="Mua ngay"
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
