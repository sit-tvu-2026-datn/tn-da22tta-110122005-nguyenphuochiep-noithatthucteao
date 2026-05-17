import { useState, useEffect, useContext, useCallback, useMemo, useRef } from "react";
import {
  ShoppingCartOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import { message, Empty, Spin, Drawer, Checkbox } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, ChevronLeft, ChevronRight, Eye, ShoppingCart, Filter, X, Grid, Zap, Clock } from "lucide-react";
import Cookies from "js-cookie";
import { CartContext } from "../context/CartContext.jsx";
import api from "../config/api";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá: thấp đến cao" },
  { value: "price-desc", label: "Giá: cao đến thấp" },
  { value: "name-asc", label: "Tên: A - Z" },
];

const MotionDiv = motion.div;

const getCategoryFiltersFromParam = (categoryParam) =>
  categoryParam ? categoryParam.split(",").map((id) => String(id).trim()).filter(Boolean) : [];

const getProductTimestamp = (product) => {
  const rawDate =
    product.createdAt ||
    product.createdDate ||
    product.created_at ||
    product.updatedAt ||
    product.updatedDate ||
    product.updated_at;
  const timestamp = rawDate ? new Date(rawDate).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareProductName = (a, b) =>
  String(a.productName || "").localeCompare(String(b.productName || ""), "vi", {
    sensitivity: "base",
  });

const buildPageItems = (currentPage, totalPages) => {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sortedPages.reduce((items, page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      items.push(`ellipsis-${page}`);
    }
    items.push(page);
    return items;
  }, []);
};

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

  const timeBoxClass =
    "bg-[#6b2a2a] text-white rounded px-2 py-1 flex items-baseline gap-1 min-w-[65px] justify-center";

  return (
    <div className="flex items-center justify-center gap-3 rounded-lg px-4 py-1.5">
      <div className="flex items-center gap-1.5">
        <Clock size={18} className="text-white" />
        <span className="text-yellow-300 font-bold text-base uppercase tracking-wide">
          Kết thúc trong
        </span>
      </div>

      <div className="flex items-center gap-1.5 font-bold">
        {timeLeft.days > 0 && (
          <>
            <div className={timeBoxClass}>
              <span className="text-lg">{pad(timeLeft.days)}</span>
              <span className="text-xs font-normal">ngày</span>
            </div>
            <span className="text-white">:</span>
          </>
        )}

        <div className={timeBoxClass}>
          <span className="text-lg">{pad(timeLeft.hours)}</span>
          <span className="text-xs font-normal">giờ</span>
        </div>

        <span className="text-white">:</span>

        <div className={timeBoxClass}>
          <span className="text-lg">{pad(timeLeft.minutes)}</span>
          <span className="text-xs font-normal">phút</span>
        </div>

        <span className="text-white">:</span>

        <div className={timeBoxClass}>
          <span className="text-lg">{pad(timeLeft.seconds)}</span>
          <span className="text-xs font-normal">giây</span>
        </div>
      </div>
    </div>
  );
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [flashSale, setFlashSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isFilterSheet, setIsFilterSheet] = useState(false);
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const productListRef = useRef(null);
  const didMountPageRef = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category");

  // State lưu trữ các bộ lọc đang chọn (Mảng để hỗ trợ chọn nhiều)
  const [selectedCategories, setSelectedCategories] = useState(
    () => getCategoryFiltersFromParam(initialCategory),
  );
  const [selectedPrices, setSelectedPrices] = useState([]);
  const activeFilterCount = selectedCategories.length + selectedPrices.length;
  const activeFilters = useMemo(
    () => ({
      searchTerm,
      categories: selectedCategories,
      prices: selectedPrices,
    }),
    [searchTerm, selectedCategories, selectedPrices],
  );

  const [messageApi, contextHolder] = message.useMessage();
  const token = Cookies.get("jwt");
  const { refreshCartCount } = useContext(CartContext);

  useEffect(() => {
    const syncFilterPanelMode = () => {
      setIsFilterSheet(window.innerWidth < 768);
    };

    syncFilterPanelMode();
    window.addEventListener("resize", syncFilterPanelMode);

    return () => window.removeEventListener("resize", syncFilterPanelMode);
  }, []);

  useEffect(() => {
    const nextCategories = getCategoryFiltersFromParam(initialCategory);
    setSelectedCategories((current) =>
      current.join(",") === nextCategories.join(",") ? current : nextCategories,
    );
  }, [initialCategory]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, fsRes, prodRes] = await Promise.all([
          api.get("/api/categories"),
          api.get("/api/flash-sales/current").catch(() => ({ data: null })),
          api.get("/api/products"), // Lấy toàn bộ sản phẩm để lọc ở frontend
        ]);

        setCategories(catRes.data);

        if (fsRes.data && fsRes.data.status === "Active") {
          setFlashSale(fsRes.data);
        } else {
          setFlashSale(null);
        }

        setProducts(prodRes.data);
      } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- HELPER ---
  const getProductPriceInfo = useCallback((product) => {
    if (flashSale && flashSale.items) {
      const fsItem = flashSale.items.find(
        (item) => item.productId === product.productId,
      );
      if (fsItem) {
        const isStillOnSale = fsItem.soldCount < fsItem.quantity;
        if (isStillOnSale) {
          return {
            finalPrice: fsItem.flashSalePrice,
            originalPrice: product.price,
            discountPercent: Math.round(
              ((product.price - fsItem.flashSalePrice) / product.price) * 100,
            ),
            isFlashSale: true,
            fsQuantity: fsItem.quantity,
            fsSold: fsItem.soldCount,
          };
        }
      }
    }

    const normalFinalPrice =
      product.discount > 0
        ? product.price * (1 - product.discount / 100)
        : product.price;

    return {
      finalPrice: normalFinalPrice,
      originalPrice: product.price,
      discountPercent: product.discount,
      isFlashSale: false,
    };
  }, [flashSale]);

  const flashSaleList = useMemo(() => (
    flashSale?.items
      ?.filter((fsItem) => fsItem.soldCount < fsItem.quantity)
      ?.map((fsItem) => {
        return products.find((p) => p.productId === fsItem.productId);
      })
      .filter(Boolean) || []
  ), [flashSale, products]);

  // Pipeline: full product list -> filters -> sorting -> pagination.
  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchesName = String(p.productName || "")
      .toLowerCase()
      .includes(activeFilters.searchTerm.toLowerCase());

    const prodCatId = String(p.categoryId || p.category?.categoryId);
    const matchesCategory =
      activeFilters.categories.length === 0 || activeFilters.categories.includes(prodCatId);

    const { finalPrice } = getProductPriceInfo(p);
    const matchesPrice =
      activeFilters.prices.length === 0 ||
      activeFilters.prices.some(
        (range) => finalPrice >= range.min && finalPrice <= range.max,
      );

    return matchesName && matchesCategory && matchesPrice;
  }), [products, activeFilters, getProductPriceInfo]);

  const sortedProducts = useMemo(() => filteredProducts
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const productA = a.product;
      const productB = b.product;
      const priceA = Number(getProductPriceInfo(productA).finalPrice || 0);
      const priceB = Number(getProductPriceInfo(productB).finalPrice || 0);

      if (sortOption === "price-asc") {
        return priceA - priceB || compareProductName(productA, productB) || a.index - b.index;
      }

      if (sortOption === "price-desc") {
        return priceB - priceA || compareProductName(productA, productB) || a.index - b.index;
      }

      if (sortOption === "name-asc") {
        return compareProductName(productA, productB) || a.index - b.index;
      }

      const timestampA = getProductTimestamp(productA);
      const timestampB = getProductTimestamp(productB);
      if (timestampA || timestampB) {
        return timestampB - timestampA || a.index - b.index;
      }

      return a.index - b.index;
    })
    .map(({ product }) => product), [filteredProducts, getProductPriceInfo, sortOption]);

  const totalProducts = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / itemsPerPage));
  const pageStartIndex = totalProducts === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const pageEndIndex = Math.min(pageStartIndex + itemsPerPage, totalProducts);
  const paginatedProducts = useMemo(
    () => sortedProducts.slice(pageStartIndex, pageStartIndex + itemsPerPage),
    [sortedProducts, pageStartIndex, itemsPerPage],
  );
  const pageItems = useMemo(() => buildPageItems(currentPage, totalPages), [currentPage, totalPages]);
  const productListKey = `${sortOption}-${currentPage}-${activeFilters.searchTerm}-${activeFilters.categories.join(",")}-${activeFilters.prices
    .map((price) => `${price.min}-${price.max}`)
    .join("|")}`;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilters, sortOption]);

  useEffect(() => {
    setCurrentPage((page) => (page > totalPages ? totalPages : page));
  }, [totalPages]);

  useEffect(() => {
    if (!didMountPageRef.current) {
      didMountPageRef.current = true;
      return;
    }

    productListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentPage]);

  const handleSortChange = (event) => {
    setSortOption(event.target.value);
  };

  const goToPage = (page) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
  };

  const handleCategoryToggle = (categoryId) => {
    const idStr = String(categoryId);
    setSelectedCategories((prev) => {
      const newSelected = prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : [...prev, idStr];

      // Đồng bộ với URL Params (tùy chọn để link có thể chia sẻ)
      const newParams = new URLSearchParams(searchParams);
      if (newSelected.length === 0) {
        newParams.delete("category");
      } else {
        newParams.set("category", newSelected.join(","));
      }
      setSearchParams(newParams);

      return newSelected;
    });
  };

  const priceOptions = [
    { label: "Dưới 1 triệu", min: 0, max: 1000000 },
    { label: "1 triệu - 3 triệu", min: 1000000, max: 3000000 },
    { label: "3 triệu - 7 triệu", min: 3000000, max: 7000000 },
    { label: "Trên 7 triệu", min: 7000000, max: Infinity },
  ];

  const handlePriceToggle = (opt) => {
    setSelectedPrices((prev) => {
      const exists = prev.some((p) => p.min === opt.min && p.max === opt.max);
      if (exists) {
        return prev.filter((p) => p.min !== opt.min || p.max !== opt.max);
      } else {
        return [...prev, opt];
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedPrices([]);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    setSearchParams(newParams);
  };

  // --- LOGIC MUA HÀNG ---
  const handleAddToCart = async (product) => {
    if (!token) {
      messageApi.warning("Vui lòng đăng nhập!");
      return;
    }

    const { finalPrice, isFlashSale, fsQuantity, fsSold } =
      getProductPriceInfo(product);

    if (isFlashSale) {
      if (fsSold >= fsQuantity) {
        messageApi.error("Sản phẩm Flash Sale này đã hết suất!");
        return;
      }
    } else if (product.quantity <= 0) {
      messageApi.error("Sản phẩm đã hết hàng!");
      return;
    }

    const orderPayload = {
      userId: Cookies.get("user_id"),
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
          isFlashSale: isFlashSale ? 1 : 0,
        },
      ],
    };

    try {
      await api.post("/api/orders", orderPayload);
      messageApi.success({
        content: `Đã thêm ${product.productName} vào giỏ!`,
        icon: <ShoppingCartOutlined style={{ color: "green" }} />,
      });
      refreshCartCount(Cookies.get("user_id"), token);
    } catch {
      messageApi.error("Lỗi kết nối server");
    }
  };

  const ProductCard = ({ prod, isFsSection = false }) => {
    const {
      finalPrice,
      originalPrice,
      discountPercent,
      isFlashSale,
      fsSold,
      fsQuantity,
    } = getProductPriceInfo(prod);
    const isOutOfStock = prod.quantity <= 0;
    const soldPercent = isFlashSale
      ? Math.round((fsSold / fsQuantity) * 100)
      : 0;

    return (
      <div
        className={`group bg-white rounded-xl border ${
          isFsSection
            ? "border-orange-200 shadow-md min-w-[220px]"
            : "border-gray-100"
        } overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col relative`}
      >
        <div className="relative pt-[100%] bg-gray-100 overflow-hidden">
          {discountPercent > 0 && !isOutOfStock && (
            <div
              className={`absolute top-2 left-2 z-10 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1 ${
                isFlashSale ? "bg-orange-600" : "bg-red-500"
              }`}
            >
              {isFlashSale && <Zap size={10} fill="currentColor" />} -
              {discountPercent}%
            </div>
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
              <span className="text-white font-bold text-lg border-2 border-white px-4 py-1 tracking-widest uppercase transform -rotate-12">
                Hết hàng
              </span>
            </div>
          )}

          <img
            src={
              prod.imageUrls?.[0] ||
              prod.imageUrl ||
              "https://via.placeholder.com/400x400?text=No+Image"
            }
            alt={prod.productName}
            className={`absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isOutOfStock ? "grayscale" : ""
            }`}
          />

          {!isOutOfStock && (
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px] z-10">
              <button
                onClick={() => handleAddToCart(prod)}
                className="bg-white text-gray-800 p-2.5 rounded-full hover:bg-blue-600 hover:text-white shadow-lg"
              >
                <ShoppingCart size={20} />
              </button>
              <Link
                to={`/product/${prod.productId}`}
                className="bg-white text-gray-800 p-2.5 rounded-full hover:bg-blue-600 hover:text-white shadow-lg"
              >
                <Eye size={20} />
              </Link>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <Link
            to={`/product/${prod.productId}`}
            className="group-hover:text-blue-600 transition-colors"
          >
            <h3 className="font-medium text-gray-800 text-sm sm:text-base line-clamp-2 min-h-[40px] leading-snug mb-2">
              {prod.productName}
            </h3>
          </Link>

          {isFlashSale && isFsSection && !isOutOfStock && (
            <div className="mb-3">
              <div className="relative w-full h-3 bg-orange-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-red-500"
                  style={{ width: `${soldPercent}%` }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white uppercase drop-shadow-md">
                  {soldPercent >= 90 ? "Sắp hết" : `Đã bán ${fsSold}`}
                </span>
              </div>
            </div>
          )}

          <div className="mt-auto">
            <div className="flex gap-2 items-baseline flex-wrap">
              <span
                className={`font-bold text-base sm:text-lg ${
                  isOutOfStock
                    ? "text-gray-400"
                    : isFlashSale
                      ? "text-orange-600"
                      : "text-red-600"
                }`}
              >
                {finalPrice?.toLocaleString("vi-VN")}₫
              </span>
              {discountPercent > 0 && !isOutOfStock && (
                <span className="text-gray-400 text-xs line-through">
                  {originalPrice?.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>
          </div>

          {!isOutOfStock && (
            <button
              onClick={() => handleAddToCart(prod)}
              className={`mt-3 w-full text-xs font-bold py-2 rounded-lg transition 
                        ${
                          isFlashSale
                            ? "bg-orange-100 text-orange-600 hover:bg-orange-600 hover:text-white lg:hidden"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white lg:hidden"
                        }`}
            >
              {isFlashSale ? "MUA NGAY" : "THÊM VÀO GIỎ"}
            </button>
          )}
        </div>
      </div>
    );
  };

  const FilterContent = () => (
    <div className="space-y-8">
      {/* Category Checkbox Filter */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Grid size={16} /> Danh mục
        </h3>
        <div className="space-y-3 px-1">
          {categories.map((cat) => (
            <div key={cat.categoryId} className="flex items-center">
              <Checkbox
                checked={selectedCategories.includes(String(cat.categoryId))}
                onChange={() => handleCategoryToggle(cat.categoryId)}
                className="text-gray-700 hover:text-blue-600 text-sm"
              >
                {cat.categoryName}
              </Checkbox>
            </div>
          ))}
        </div>
      </div>

      {/* Price Checkbox Filter */}
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
          Khoảng giá
        </h3>
        <div className="space-y-3 px-1">
          {priceOptions.map((opt, i) => (
            <div key={i} className="flex items-center">
              <Checkbox
                checked={selectedPrices.some(
                  (p) => p.min === opt.min && p.max === opt.max,
                )}
                onChange={() => handlePriceToggle(opt)}
                className="text-gray-700 hover:text-blue-600 text-sm"
              >
                {opt.label}
              </Checkbox>
            </div>
          ))}
        </div>
      </div>

      {(selectedCategories.length > 0 || selectedPrices.length > 0) && (
        <button
          onClick={clearAllFilters}
          className="w-full py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition mt-4"
        >
          Xóa tất cả bộ lọc
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <Spin size="large" tip="Đang tải dữ liệu..." />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {contextHolder}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* FLASH SALE AREA */}
        {flashSale && flashSaleList.length > 0 && (
          <div className="mt-6 mb-8">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-t-xl p-4 flex flex-wrap items-center justify-between text-white shadow-lg gap-4">
              <div className="flex items-center gap-3">
                <ThunderboltFilled className="text-3xl text-yellow-300 animate-pulse" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-wider text-white drop-shadow-md">
                    {flashSale.name}
                  </h2>
                </div>
              </div>

              <FlashSaleTimer endDate={flashSale.endDate} />
            </div>

            <div className="bg-orange-50 border-x border-b border-orange-200 p-4 rounded-b-xl shadow-sm">
              <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide">
                {flashSaleList.map((prod) => (
                  <div
                    key={prod.productId}
                    className="flex-shrink-0 w-[200px] sm:w-[220px]"
                  >
                    <ProductCard prod={prod} isFsSection={true} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MAIN LIST */}
        <div
          ref={productListRef}
          className="flex flex-col gap-4 border-b border-gray-200 mb-4 pt-4 pb-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {selectedCategories.length > 0
                ? `Đang lọc theo ${selectedCategories.length} danh mục`
                : "Tất cả sản phẩm"}
            </h1>
            
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm">
              <ArrowUpDown size={16} className="text-gray-500" />
              <select
                value={sortOption}
                onChange={handleSortChange}
                className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
                aria-label="Sắp xếp sản phẩm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            >
              <Filter size={18} className="transition duration-300 group-hover:rotate-12" />
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-[11px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <Drawer
            title={
              <div className="flex items-center gap-2">
                <Filter size={18} />
                <span>Bộ lọc sản phẩm</span>
              </div>
            }
            placement={isFilterSheet ? "bottom" : "right"}
            onClose={() => setMobileFilterOpen(false)}
            open={mobileFilterOpen}
            width={380}
            height={isFilterSheet ? "86vh" : undefined}
            maskClosable
            closeIcon={<X size={18} />}
            styles={{
              mask: {
                backdropFilter: "blur(4px)",
                background: "rgba(15, 23, 42, 0.28)",
              },
              content: {
                borderRadius: isFilterSheet ? "24px 24px 0 0" : "0",
                overflow: "hidden",
              },
              header: {
                borderBottom: "1px solid #eef0f3",
                padding: "18px 22px",
              },
              body: {
                padding: "24px 22px",
              },
            }}
          >
            <FilterContent />
          </Drawer>

          <div className="flex-1">
            <AnimatePresence mode="wait">
              {totalProducts === 0 ? (
                <MotionDiv
                  key="empty-products"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  className="bg-white rounded-xl shadow-sm p-16 flex flex-col items-center justify-center text-center"
                >
                  <Empty description="Không tìm thấy sản phẩm nào phù hợp" />
                  <button
                    onClick={clearAllFilters}
                    className="mt-4 text-blue-600 font-medium hover:underline"
                  >
                    Xóa tất cả bộ lọc
                  </button>
                </MotionDiv>
              ) : (
                <MotionDiv
                  key={productListKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28 }}
                  className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
                >
                  {paginatedProducts.map((prod) => (
                    <ProductCard
                      key={prod.productId}
                      prod={prod}
                      isFsSection={false}
                    />
                  ))}
                </MotionDiv>
              )}
            </AnimatePresence>

            {totalProducts > 0 && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center">
                <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:hidden">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Trước
                  </button>
                  <span className="text-sm font-semibold text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm sm:flex">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Trước
                  </button>

                  {pageItems.map((item) => (
                    typeof item === "string" ? (
                      <span key={item} className="px-2 text-sm text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => goToPage(item)}
                        className={`h-10 min-w-10 rounded-lg px-3 text-sm font-semibold transition ${
                          item === currentPage
                            ? "bg-gray-900 text-white"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  ))}

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Sau
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
