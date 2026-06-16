import { useState, useContext, useRef, useEffect } from "react";
import {
  ShoppingCart,
  User,
  Search,
  LogOut,
  Shield,
  Settings,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { CartContext } from "../context/CartContext";
import MainMenu from "./MainMenu";
import { message } from "antd";
import Cookies from "js-cookie";

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // --- STATE CHO HIỆU ỨNG CUỘN ---
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  const { cartCount, refreshCartCount, resetCartCount } =
    useContext(CartContext);
  const { user, logout } = useContext(AuthContext);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("search") || "");

  const menuRef = useRef(null);
  const [messageApi, contextHolder] = message.useMessage();

  const isLoggedIn = !!user;

  // Sync input với URL khi URL thay đổi
  useEffect(() => {
    setKeyword(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    if (user) refreshCartCount(Cookies.get("user_id"), Cookies.get("jwt"));
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [user]);

  // --- USEEFFECT XỬ LÝ SỰ KIỆN SCROLL ---
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Theo dõi đã scroll chưa để đổi background
      setIsScrolled(currentScrollY > 20);

      // Nếu ở sát trên cùng thì luôn hiện (tránh giật lag ở top)
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Đang cuộn xuống -> Ẩn
        setIsVisible(false);
        // Đóng luôn menu user nếu đang mở để tránh lỗi UI
        setShowUserMenu(false);
      } else {
        // Đang cuộn lên -> Hiện
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);
  // ------------------------------------------

  const handleLogout = () => {
    logout();
    resetCartCount();
    setShowUserMenu(false);
    messageApi.success("Đăng xuất thành công");
    navigate("/");
  };

  const handleSearch = () => {
    if (keyword.trim()) {
      navigate(`/products?search=${encodeURIComponent(keyword.trim())}`);
    } else {
      navigate(`/products`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-500 ease-in-out font-montserrat ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      } ${
        isScrolled
          ? "bg-nero/95 backdrop-blur-md shadow-[0_1px_0_rgba(200,169,110,0.1)]"
          : "bg-nero/80 backdrop-blur-sm"
      }`}
    >
      {contextHolder}

      {/* TẦNG 1: LOGO - SEARCH - ACTIONS */}
      <div className="border-b border-champagne/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="shrink-0 flex items-center gap-1"
          >
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-[0.02em] uppercase">
              NPH
            </span>
            <span className="text-xl sm:text-2xl font-extrabold text-champagne tracking-[0.02em] uppercase">
              STORE
            </span>
          </Link>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-auto relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-10 pr-12 py-2.5 bg-white/[0.06] border border-champagne/15 text-white placeholder-white/30 text-sm font-light tracking-wide focus:outline-none focus:border-champagne/40 focus:bg-white/[0.09] transition-all duration-300"
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 rounded-sm transition-colors text-white/50 hover:text-champagne"
            >
              <Search size={16} />
            </button>
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none"
              size={16}
            />
          </div>

          {/* Actions: Cart & User */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Mobile search */}
            <button
              onClick={() => navigate("/products")}
              className="md:hidden p-2 text-white/60 hover:text-champagne transition-colors"
            >
              <Search size={20} />
            </button>

            {/* Cart */}
            <button
              onClick={() => navigate("/cart")}
              className="relative p-2 text-white/70 hover:text-champagne transition-colors group"
            >
              <ShoppingCart
                size={22}
                strokeWidth={1.5}
                className="transition-colors"
              />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-champagne text-nero text-[9px] font-bold h-[18px] min-w-[18px] flex items-center justify-center px-1">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-champagne/15" />

            {!isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="hidden sm:block text-xs font-semibold text-white/60 hover:text-champagne uppercase tracking-[0.1em] px-2 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="bg-champagne text-nero text-xs font-bold px-5 py-2 uppercase tracking-[0.1em] hover:shadow-[0_0_20px_rgba(200,169,110,0.25)] transition-all duration-300"
                >
                  Đăng ký
                </Link>
              </div>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2.5 p-1 pr-3 border border-champagne/15 hover:border-champagne/30 transition-all bg-white/[0.04] hover:bg-white/[0.08]"
                >
                  <div className="w-7 h-7 bg-champagne/10 overflow-hidden">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        className="w-full h-full object-cover"
                        alt="avatar"
                      />
                    ) : (
                      <User className="p-1 w-full h-full text-champagne/60" />
                    )}
                  </div>
                  <span className="hidden sm:block text-xs font-medium text-white/70 max-w-[80px] truncate tracking-wide">
                    {user.fullName}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-nero border border-champagne/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)] py-1.5 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    {/* User Info */}
                    <div className="px-5 py-3 border-b border-champagne/10">
                      <p className="font-semibold text-white text-sm truncate">
                        {user.fullName}
                      </p>
                      <p className="text-[11px] text-white/35 truncate mt-0.5 tracking-wide">
                        {user.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {user.role === "ADMIN" && (
                        <Link
                          to="/admin"
                          className="px-5 py-2.5 flex items-center gap-3 text-xs font-medium text-white/60 hover:bg-champagne/10 hover:text-champagne transition-colors uppercase tracking-[0.08em]"
                        >
                          <Shield size={14} strokeWidth={1.5} /> Trang quản trị
                        </Link>
                      )}
                      <Link
                        to="/purchase"
                        className="px-5 py-2.5 flex items-center gap-3 text-xs font-medium text-white/60 hover:bg-champagne/10 hover:text-champagne transition-colors uppercase tracking-[0.08em]"
                      >
                        <ShoppingCart size={14} strokeWidth={1.5} /> Đơn mua hàng
                      </Link>
                      <Link
                        to="/edit-profile"
                        className="px-5 py-2.5 flex items-center gap-3 text-xs font-medium text-white/60 hover:bg-champagne/10 hover:text-champagne transition-colors uppercase tracking-[0.08em]"
                      >
                        <Settings size={14} strokeWidth={1.5} /> Cài đặt tài khoản
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-champagne/10 mt-1 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-5 py-2.5 flex items-center gap-3 text-xs font-medium text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors uppercase tracking-[0.08em]"
                      >
                        <LogOut size={14} strokeWidth={1.5} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TẦNG 2: MAIN MENU */}
      <MainMenu />
    </header>
  );
}
