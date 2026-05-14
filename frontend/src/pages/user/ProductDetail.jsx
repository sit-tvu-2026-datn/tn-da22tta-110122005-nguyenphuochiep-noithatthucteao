import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ShoppingCartOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { message, Button, Spin, Rate, Tabs, Avatar } from "antd";
import { Eye, Clock, Zap, Box, Image as ImageIcon } from "lucide-react";
import Cookies from "js-cookie";
import { CartContext } from "../../context/CartContext";
import "@google/model-viewer"; // [NEW] Import trực tiếp thư viện 3D/AR
import api from "../../config/api";

// --- COMPONENT TIMER ---
const FlashSaleTimer = ({ endDate }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(endDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    } else {
      return null;
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft)
    return <span className="text-sm font-bold text-white">Đã kết thúc</span>;
  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-2 text-white font-bold bg-black/20 px-3 py-1 rounded-lg">
      <Clock size={16} />
      <span>
        {timeLeft.days > 0 ? `${pad(timeLeft.days)}d : ` : ""}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    </div>
  );
};

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  // State Product
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // [NEW] State for Media Tabs (Image vs AR)
  const [activeMediaTab, setActiveMediaTab] = useState("image");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // State Flash Sale
  const [flashSale, setFlashSale] = useState(null);

  // State Reviews
  const [reviews, setReviews] = useState([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Check purchase
  const [hasPurchased, setHasPurchased] = useState(false);

  // Context & Auth
  const { refreshCartCount } = useContext(CartContext);
  const token = Cookies.get("jwt");
  const currentUserId = Cookies.get("user_id");

  // --- 1. FETCH FLASH SALE ---
  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        const res = await api.get("/api/flash-sales/current");
        if (res.data && res.data.status === "Active") {
          setFlashSale(res.data);
        }
      } catch (err) {
        console.error("API Error:", err);
      }
    };
    fetchFlashSale();
  }, []);

  // --- 2. FETCH PRODUCT ---
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/products/${productId}`);
        const data = res.data;
        setProduct(data);
        setQuantity(1);
      } catch (err) {
        console.error("API Error:", err);
        const isProd1 =
          productId === "1" || productId === "test-ar-1" || productId === "p1";
        setProduct({
          productId: productId,
          productName: isProd1
            ? "Bàn trà kính cường lực (AR test)"
            : "Ghế thư giãn Eames (AR test)",
          price: isProd1 ? 2500000 : 1200000,
          discount: isProd1 ? 0 : 5,
          quantity: 10,
          description:
            "Sản phẩm mẫu thử nghiệm AR khi API offline. Hỗ trợ xem mô hình 3D trên Web và AR trên thiết bị di động.",
          size: "Tiêu chuẩn",
          color: "Xám",
          material: "Gỗ / Nhựa",
          warranty: "12 Tháng",
          origin: "Việt Nam",
          imageUrls: isProd1
            ? [
              "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=500",
              "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=500",
            ]
            : [
              "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?w=500",
              "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=500",
            ],
          arModelGltf: isProd1
            ? "/assets/models/modern__sofa.glb"
            : "/assets/models/chair.glb",
          arModelUsdz: isProd1
            ? "/assets/models/modern__sofa.usdz"
            : "/assets/models/chair.usdz",
        });
        setQuantity(1);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo(0, 0);
  }, [productId]);

  // --- FETCH RELATED & REVIEWS & PURCHASE STATUS ---
  useEffect(() => {
    if (!productId) return;
    const fetchRelated = async () => {
      try {
        const res = await api.get(`/api/products/${productId}/related`);
        setRelatedProducts(res.data);
      } catch (err) {
        console.error("API Error:", err);
      }
    };
    fetchRelated();

    const fetchReviews = async () => {
      try {
        const res = await api.get(`/api/reviews/product/${productId}`);
        setReviews((res.data).reverse());
      } catch (err) {
        console.error("API Error:", err);
      }
    };
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    if (!token || !currentUserId || !productId) return;
    const checkPurchaseStatus = async () => {
      try {
        const res = await api.get(`/api/orders/user/${currentUserId}`);
        const orders = res.data;
        const bought = orders.some((order) => {
          const isDelivered = (order.orderStatus || "").toLowerCase() === "delivered";
          if (!isDelivered) return false;
          return order.orderDetails.some(
            (detail) => detail.product?.productId.toString() === productId.toString()
          );
        });
        setHasPurchased(bought);
      } catch (err) {
        console.error("API Error:", err);
      }
    };
    checkPurchaseStatus();
  }, [currentUserId, productId, token]);

  // --- 3. HELPER: TÍNH GIÁ & FLASH SALE ---
  const getProductPriceInfo = (prod) => {
    if (!prod) return {};
    if (flashSale && flashSale.items) {
      const fsItem = flashSale.items.find(
        (item) => item.productId === prod.productId
      );
      if (fsItem) {
        const isStillOnSale = fsItem.soldCount < fsItem.quantity;
        if (isStillOnSale) {
          return {
            finalPrice: fsItem.flashSalePrice,
            originalPrice: prod.price,
            discountPercent: Math.round(
              ((prod.price - fsItem.flashSalePrice) / prod.price) * 100
            ),
            isFlashSale: true,
            fsQuantity: fsItem.quantity,
            fsSold: fsItem.soldCount,
            maxAvailable: fsItem.quantity - fsItem.soldCount,
          };
        }
      }
    }

    const normalFinalPrice =
      prod.discount > 0 ? prod.price * (1 - prod.discount / 100) : prod.price;

    return {
      finalPrice: normalFinalPrice,
      originalPrice: prod.price,
      discountPercent: prod.discount,
      isFlashSale: false,
      maxAvailable: prod.quantity,
    };
  };

  const {
    finalPrice,
    originalPrice,
    discountPercent,
    isFlashSale,
    fsSold,
    fsQuantity,
    maxAvailable,
  } = getProductPriceInfo(product);

  const isOutOfStock = product?.quantity <= 0;
  const soldPercent = isFlashSale ? Math.round((fsSold / fsQuantity) * 100) : 0;

  // Image & AR Variables
  const imagesList = product?.imageUrls?.length > 0 ? product.imageUrls : (product?.imageUrl ? [product.imageUrl] : ["https://via.placeholder.com/600x600?text=No+Image"]);
  const currentImage = imagesList[activeImageIndex] || imagesList[0];
  const hasARModel = !!(product?.arModelGltf || product?.arLink);

  // --- 4. HANDLE ADD TO CART ---
  const handleAddToCart = async (prod, qty = 1) => {
    if (!token) {
      messageApi.warning("Vui lòng đăng nhập để mua hàng!");
      navigate("/login");
      return;
    }

    const selectedProduct = prod || product;
    const priceInfo = getProductPriceInfo(selectedProduct);

    if (priceInfo.isFlashSale) {
      if (qty > priceInfo.maxAvailable) {
        messageApi.warning(`Chỉ còn ${priceInfo.maxAvailable} suất Flash Sale!`);
        return;
      }
    } else if (selectedProduct.quantity <= 0) {
      messageApi.info("Sản phẩm đang hết hàng. Bạn đang đặt trước sản phẩm này.");
    }

    const orderPayload = {
      userId: Cookies.get("user_id"),
      totalAmount: priceInfo.finalPrice * qty,
      orderStatus: "pending",
      shippingAddress: "cart",
      isOrder: 0,
      orderDetails: [
        {
          product: { productId: selectedProduct.productId },
          quantity: qty,
          unitPrice: priceInfo.finalPrice,
          originalUnitPrice: selectedProduct.price,
          isFlashSale: priceInfo.isFlashSale ? 1 : 0,
        },
      ],
    };

    try {
      await api.post("/api/orders", orderPayload);

      messageApi.success({
        content: `Đã thêm ${qty} ${selectedProduct.productName} vào giỏ!`,
        icon: <ShoppingCartOutlined style={{ color: "green" }} />,
      });
      refreshCartCount(currentUserId, token);
    } catch (err) {
      console.error("API Error:", err);
      messageApi.error("Không thể thêm vào giỏ hàng. Vui lòng thử lại.");
    }
  };

  // --- 5. HANDLE BUY NOW ---
  const handleBuyNow = () => {
    if (!token) {
      messageApi.warning("Vui lòng đăng nhập để mua hàng!");
      navigate("/login");
      return;
    }

    if (isFlashSale) {
      if (quantity > maxAvailable) {
        messageApi.warning(`Chỉ còn ${maxAvailable} suất Flash Sale!`);
        return;
      }
    } else if (isOutOfStock || quantity > product.quantity) {
      messageApi.warning("Sản phẩm không đủ số lượng!");
      return;
    }

    navigate("/checkout", {
      state: {
        product: {
          ...product,
          price: finalPrice,
          originalPrice: product.price,
          isFlashSale: isFlashSale,
        },
        quantity: quantity,
      },
    });
  };

  const handleSubmitReview = async () => {
    if (!token) {
      messageApi.warning("Vui lòng đăng nhập để đánh giá!");
      return;
    }
    if (!commentInput.trim()) {
      messageApi.warning("Vui lòng nhập nội dung đánh giá!");
      return;
    }
    setSubmittingReview(true);
    try {
      const payload = {
        userId: currentUserId,
        productId: productId,
        rating: ratingInput,
        comment: commentInput,
      };
      const res = await api.post("/api/reviews", payload);
      const newReview = res.data;
      setReviews([newReview, ...reviews]);
      setCommentInput("");
      setRatingInput(5);
      messageApi.success("Cảm ơn bạn đã đánh giá sản phẩm!");
    } catch (err) {
      console.error("API Error:", err);
      messageApi.error("Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingReview(false);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Spin size="large" />
      </div>
    );
  if (!product)
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p>Không tìm thấy sản phẩm.</p>
        <Button onClick={() => navigate("/")}>Về trang chủ</Button>
      </div>
    );

  // Tabs
  const tabsItems = [
    {
      key: "1",
      label: "Chi tiết & Thông số",
      children: (
        <div className="py-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Thông số kỹ thuật</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12 text-sm">
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-gray-500">Kích thước</span>
              <span className="font-medium text-gray-900">{product.size || "Tiêu chuẩn"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-gray-500">Màu sắc</span>
              <span className="font-medium text-gray-900">{product.color || "Đa dạng"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-gray-500">Chất liệu</span>
              <span className="font-medium text-gray-900">{product.material || "Cao cấp"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-gray-500">Bảo hành</span>
              <span className="font-medium text-gray-900">{product.warranty || "12 Tháng"}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-50">
              <span className="text-gray-500">Xuất xứ</span>
              <span className="font-medium text-gray-900">{product.origin || "Việt Nam"}</span>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Mô tả sản phẩm</h3>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">
              {product.description || "Chưa có mô tả chi tiết."}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: `Đánh giá khách hàng (${reviews.length})`,
      children: (
        <div className="py-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-gray-50 p-6 rounded-xl text-center mb-6">
                <h4 className="text-gray-500 mb-1">Đánh giá trung bình</h4>
                <div className="text-5xl font-bold text-gray-800 mb-2">{averageRating}/5</div>
                <Rate disabled allowHalf value={parseFloat(averageRating)} className="text-yellow-400 text-lg" />
                <div className="text-sm text-gray-400 mt-2">({reviews.length} nhận xét)</div>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4">Viết đánh giá của bạn</h4>
                {!token ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-3 text-sm">Vui lòng đăng nhập để viết đánh giá</p>
                    <Button onClick={() => navigate("/login")}>Đăng nhập ngay</Button>
                  </div>
                ) : !hasPurchased ? (
                  <div className="text-center py-4 bg-yellow-50 rounded-lg border border-yellow-100 p-4">
                    <ShoppingCartOutlined className="text-2xl text-yellow-500 mb-2" />
                    <p className="text-gray-700 font-semibold text-sm mb-1">Chưa mua sản phẩm</p>
                    <p className="text-gray-500 text-xs">Bạn cần mua sản phẩm này và nhận hàng thành công để có thể viết đánh giá.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <span className="block text-sm text-gray-600 mb-2">Bạn chấm sản phẩm này bao nhiêu sao?</span>
                      <Rate value={ratingInput} onChange={setRatingInput} className="text-yellow-400 text-2xl" />
                    </div>
                    <div className="mb-4">
                      <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 transition"
                        rows="4"
                        placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                      ></textarea>
                    </div>
                    <Button
                      type="primary"
                      onClick={handleSubmitReview}
                      loading={submittingReview}
                      className="w-full h-10 bg-blue-600 hover:bg-blue-500 border-none font-semibold"
                    >
                      Gửi đánh giá
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="lg:col-span-2">
              <h4 className="font-bold text-gray-800 mb-4 text-lg">Nhận xét gần đây</h4>
              {reviews.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-gray-300 rounded-xl">
                  <p className="text-gray-400">Chưa có đánh giá nào cho sản phẩm này.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((rev) => (
                    <div key={rev.reviewId} className="flex gap-4 border-b border-gray-100 pb-6 last:border-0">
                      <Avatar icon={<UserOutlined />} size="large" className="flex-shrink-0 bg-gray-200" />
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <span className="font-bold text-gray-800 block">{rev.userName || "Người dùng ẩn danh"}</span>
                            <span className="text-xs text-gray-400">
                              {rev.createdAt ? new Date(rev.createdAt).toLocaleString("vi-VN") : ""}
                            </span>
                          </div>
                          <Rate disabled value={rev.rating} className="text-yellow-400 text-xs" />
                        </div>
                        <p className="text-gray-600 text-sm mt-2 bg-gray-50 p-3 rounded-lg">{rev.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-10">
      {contextHolder}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-blue-600 mb-4 sm:mb-6 transition-colors text-sm sm:text-base"
        >
          <ArrowLeftOutlined className="mr-2" /> Quay lại
        </button>

        {/* --- MAIN PRODUCT INFO --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

            {/* --- MEDIA SECTION (NO EFFECTS, FULL DISPLAY) --- */}
            <div className="relative flex flex-col gap-4">

              {/* Main Stage (Hình ảnh hoặc 3D) */}
              <div className="relative w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">

                {/* Hết hàng Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 z-40 bg-white/50 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                    <span className="text-gray-800 font-bold text-xl sm:text-2xl border-4 border-gray-800 px-6 py-2 tracking-widest uppercase transform -rotate-12 shadow-sm bg-white/80">
                      Hết hàng
                    </span>
                  </div>
                )}

                {/* --- FLOATING PILL TOGGLE (NỔI TRÊN HÌNH ẢNH) --- */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex justify-center w-max">
                  <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full inline-flex items-center shadow-sm border border-gray-200/50">
                    <button
                      onClick={() => setActiveMediaTab("image")}
                      className={`flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${activeMediaTab === "image"
                          ? "bg-[#1c1d21] text-white shadow-md"
                          : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      <ImageIcon size={16} /> Hình ảnh
                    </button>

                    {hasARModel && (
                      <button
                        onClick={() => setActiveMediaTab("ar")}
                        className={`flex items-center gap-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${activeMediaTab === "ar"
                            ? "bg-[#1c1d21] text-white shadow-md"
                            : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        <Box size={16} /> 3D / AR
                      </button>
                    )}
                  </div>
                </div>

                {/* Nội dung Media */}
                {activeMediaTab === "ar" ? (
                  <div className="absolute inset-0 z-10 w-full h-full bg-white">
                    <model-viewer
                      src={product.arModelGltf || product.arLink}
                      ios-src={product.arModelUsdz}
                      ar
                      ar-modes="webxr scene-viewer quick-look"
                      camera-controls
                      auto-rotate
                      shadow-intensity="1"
                      alt={product.productName}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <button
                        slot="ar-button"
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#1c1d21] hover:bg-black text-white font-bold px-6 py-3 rounded-full shadow-xl flex items-center gap-2 border-none cursor-pointer transition-colors whitespace-nowrap z-50"
                      >
                        <Eye size={20} /> Ướm thử vào không gian
                      </button>
                    </model-viewer>
                  </div>
                ) : (
                  <div className="absolute inset-0 z-10 bg-white">
                    <img
                      src={currentImage}
                      alt={product.productName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Discount Badge */}
                {discountPercent > 0 && !isOutOfStock && (
                  <div className={`absolute top-4 right-4 z-20 text-white text-sm font-bold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1 ${isFlashSale ? "bg-orange-600" : "bg-red-500"}`}>
                    {isFlashSale && <Zap size={14} fill="currentColor" />}-{discountPercent}%
                  </div>
                )}
              </div>

              {/* Thumbnails Carousel */}
              <div className={`flex gap-3 overflow-x-auto pb-2 scrollbar-hide ${activeMediaTab === "ar" ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                {imagesList.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden cursor-pointer border-2 ${activeImageIndex === idx
                        ? "border-[#1c1d21] shadow-md"
                        : "border-transparent bg-gray-50 opacity-70 hover:opacity-100"
                      }`}
                  >
                    <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover mix-blend-multiply" />
                  </button>
                ))}
              </div>
            </div>
            {/* --- END MEDIA SECTION --- */}

            {/* --- INFO SECTION --- */}
            <div className="flex flex-col">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 leading-tight">
                {product.productName}
              </h1>

              {/* FLASH SALE BANNER */}
              {isFlashSale && !isOutOfStock && (
                <div className="mb-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ThunderboltFilled className="text-xl text-yellow-300 animate-pulse" />
                      <span className="font-bold italic uppercase">Flash Sale</span>
                    </div>
                    <FlashSaleTimer endDate={flashSale.endDate} />
                  </div>
                  <div className="mt-3 relative w-full h-4 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-yellow-400"
                      style={{ width: `${soldPercent}%` }}
                    ></div>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-black/70 uppercase">
                      {soldPercent >= 90 ? "Sắp hết" : `Đã bán ${fsSold}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <Rate disabled allowHalf value={parseFloat(averageRating)} className="text-yellow-400 text-sm" />
                <span className="text-sm text-gray-500">({reviews.length} đánh giá)</span>
              </div>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                  <span className={`text-3xl sm:text-4xl font-bold ${isFlashSale ? "text-orange-600" : "text-red-600"}`}>
                    {finalPrice?.toLocaleString("vi-VN")}₫
                  </span>
                  {discountPercent > 0 && (
                    <span className="text-lg sm:text-xl text-gray-400 line-through font-medium">
                      {originalPrice?.toLocaleString("vi-VN")}₫
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">Tình trạng:</span>
                  {isOutOfStock ? (
                    <span className="text-sm font-bold text-red-500">Hết hàng</span>
                  ) : isFlashSale ? (
                    <span className="text-sm font-bold text-orange-600 animate-pulse">
                      Đang trong Flash Sale (Còn {maxAvailable} suất)
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-green-600">Còn {product.quantity} sản phẩm</span>
                  )}
                </div>
              </div>

              <p className="text-gray-600 mb-8 leading-relaxed text-sm sm:text-base line-clamp-3">
                {product.description || "Chưa có mô tả chi tiết."}
              </p>

              {/* Quantity */}
              <div className="flex items-center gap-6 mb-8">
                <span className="font-semibold text-gray-700">Số lượng:</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-10">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 transition flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-12 h-full flex items-center justify-center font-semibold text-gray-800 bg-white border-x border-gray-100">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity((q) => {
                        if (isFlashSale) return q + 1 > maxAvailable ? q : q + 1;
                        if (isOutOfStock) return q + 1;
                        return q + 1 > product.quantity ? q : q + 1;
                      })
                    }
                    className="w-10 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 transition flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Buttons Action */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-auto">
                <button
                  onClick={() => handleAddToCart(product, quantity)}
                  className={`flex-1 py-3.5 px-6 border-2 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${isFlashSale ? "border-orange-500 text-orange-600 hover:bg-orange-50" : "border-blue-600 text-blue-600 hover:bg-blue-50"
                    }`}
                >
                  <ShoppingCartOutlined className="text-xl" />
                  {isOutOfStock ? "ĐẶT TRƯỚC" : "THÊM VÀO GIỎ"}
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`flex-1 py-3.5 px-6 font-bold rounded-lg shadow-md transition-all flex items-center justify-center ${isOutOfStock
                    ? "bg-gray-300 text-white cursor-not-allowed shadow-none"
                    : isFlashSale
                      ? "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-lg"
                      : "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg"
                    }`}
                >
                  {isOutOfStock ? "HẾT HÀNG" : "MUA NGAY"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <Tabs defaultActiveKey="1" items={tabsItems} />
          </div>
        </div>

        {/* --- RELATED PRODUCTS --- */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-blue-600 rounded-full block"></span>
            Sản phẩm liên quan
          </h2>
          {relatedProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <p className="text-gray-500">Chưa có sản phẩm liên quan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((prod) => {
                const final = prod.discount > 0 ? prod.price * (1 - prod.discount / 100) : prod.price;
                return (
                  <div
                    key={prod.productId}
                    className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col relative"
                  >
                    <div className="relative pt-[100%] bg-gray-100 overflow-hidden">
                      {prod.discount > 0 && (
                        <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm">
                          -{prod.discount}%
                        </span>
                      )}
                      <img
                        src={prod.imageUrls?.[0] || prod.imageUrl || "https://via.placeholder.com/400x400?text=No+Image"}
                        alt={prod.productName}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px]">
                        <button
                          onClick={() => handleAddToCart(prod)}
                          className="bg-white text-gray-800 p-2.5 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300"
                        >
                          <ShoppingCartOutlined />
                        </button>
                        <Link
                          to={`/product/${prod.productId}`}
                          className="bg-white text-gray-800 p-2.5 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-lg transform translate-y-4 group-hover:translate-y-0 duration-300 delay-75"
                        >
                          <Eye size={20} />
                        </Link>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 flex flex-col flex-grow">
                      <Link to={`/product/${prod.productId}`} className="group-hover:text-blue-600 transition-colors">
                        <h3 className="font-medium text-gray-800 text-sm sm:text-base line-clamp-2 min-h-[40px] leading-snug mb-2">
                          {prod.productName}
                        </h3>
                      </Link>
                      <div className="mt-auto">
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                          <span className="text-red-600 font-bold text-base sm:text-lg">
                            {final?.toLocaleString("vi-VN")}₫
                          </span>
                          {prod.discount > 0 && (
                            <span className="text-gray-400 text-xs line-through">
                              {prod.price?.toLocaleString("vi-VN")}₫
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddToCart(prod)}
                        className="lg:hidden mt-3 w-full bg-blue-50 text-blue-600 text-xs font-bold py-2 rounded-lg hover:bg-blue-600 hover:text-white transition"
                      >
                        THÊM VÀO GIỎ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}