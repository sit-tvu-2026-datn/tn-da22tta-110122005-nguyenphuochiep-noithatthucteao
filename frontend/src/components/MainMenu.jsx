import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown } from "lucide-react";
import api from "../config/api";

export default function MainMenu() {
  const location = useLocation();

  const [categories, setCategories] = useState([]);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [mobileSubOpen, setMobileSubOpen] = useState(false);
  const [hoveredPlanner, setHoveredPlanner] = useState(false);

  useEffect(() => {
    api
      .get("/api/categories")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  const menus = [
    { name: "Trang chủ", path: "/" },
    { name: "Sản phẩm", path: "/products", dropdown: true },
    { name: "Khuyến mãi", path: "/promotions" },
    { name: "Liên hệ", path: "/contact" },
  ];

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-transparent relative z-40 font-montserrat">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-10">
          {/* Mobile Toggle */}
          <button
            className="lg:hidden flex items-center gap-2 text-white/60 hover:text-champagne transition-colors"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            <span className="uppercase text-[10px] font-semibold tracking-[0.2em]">
              Danh mục
            </span>
          </button>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center">
            {menus.map((menu, i) => (
              <div key={i} className="relative group h-10 flex items-center">
                {menu.dropdown ? (
                  <>
                    <Link
                      to={menu.path}
                      className={`flex items-center gap-1.5 px-5 h-full text-[11px] font-semibold uppercase tracking-[0.18em] border-b transition-all duration-300
                        ${
                          isActive(menu.path)
                            ? "text-champagne border-champagne"
                            : "text-white/50 border-transparent hover:text-white hover:border-champagne/40"
                        }`}
                    >
                      {menu.name}
                      <ChevronDown size={12} strokeWidth={1.5} className="transition-transform duration-200 group-hover:rotate-180" />
                    </Link>

                    {/* Desktop Dropdown */}
                    <div
                      className="
                        absolute top-full left-0
                        w-60 bg-nero
                        border border-champagne/15
                        shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                        opacity-0 invisible
                        group-hover:opacity-100
                        group-hover:visible
                        transition-all duration-200
                        translate-y-2
                        group-hover:translate-y-0
                        z-50
                      "
                    >
                      <div className="py-1.5">
                        {categories.map((cat) => (
                          <Link
                            key={cat.categoryId}
                            to={`/products?category=${cat.categoryId}`}
                            className="
                              block px-5 py-2.5
                              text-[11px] font-medium text-white/50 uppercase tracking-[0.12em]
                              hover:bg-champagne/10
                              hover:text-champagne
                              transition-colors duration-200
                            "
                          >
                            {cat.categoryName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    to={menu.path}
                    className={`px-5 h-full flex items-center text-[11px] font-semibold uppercase tracking-[0.18em] border-b transition-all duration-300
                      ${
                        isActive(menu.path)
                          ? "text-champagne border-champagne"
                          : "text-white/50 border-transparent hover:text-white hover:border-champagne/40"
                      }`}
                  >
                    {menu.name}
                  </Link>
                )}
              </div>
            ))}

            {/* Divider */}
            <div className="w-px h-4 bg-champagne/15 mx-4" />

            {/* Room Planner */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredPlanner(true)}
              onMouseLeave={() => setHoveredPlanner(false)}
            >
              <Link
                to="/room-planner"
                className="
                  relative flex items-center gap-2
                  px-5 h-8
                  overflow-hidden
                  text-nero text-[10px] font-bold uppercase tracking-[0.15em]
                  bg-champagne
                  transition-all duration-300
                  hover:shadow-[0_0_25px_rgba(200,169,110,0.3)]
                  hover:-translate-y-0.5
                "
              >
                <svg
                  className="w-3.5 h-3.5 relative z-10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                  <rect x="9" y="13" width="6" height="8" rx="0.8" />
                </svg>

                <span className="relative z-10">Thử Nội Thất</span>

                <span
                  className="relative z-10 text-[8px] font-extrabold px-1.5 py-0.5"
                  style={{
                    background: "rgba(10,10,10,.15)",
                    border: "1px solid rgba(10,10,10,.2)",
                  }}
                >
                  3D
                </span>

                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400"
                  style={{
                    animation: "rp-pulse 1.8s ease-in-out infinite",
                  }}
                />
              </Link>

              {/* Tooltip */}
              <div
                className={`
                  absolute left-1/2 -translate-x-1/2
                  top-10
                  bg-nero text-champagne
                  text-[10px] font-medium px-3 py-2
                  whitespace-nowrap
                  border border-champagne/15
                  transition-opacity duration-200
                  pointer-events-none
                  tracking-wide
                  ${hoveredPlanner ? "opacity-100" : "opacity-0"}
                `}
              >
                Xem nội thất trong phòng của bạn ✨
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <div
          className="
            lg:hidden
            absolute top-full left-0
            w-full
            bg-nero
            border-t border-champagne/10
            shadow-[0_20px_50px_rgba(0,0,0,0.5)]
            z-50
            max-h-[calc(100vh-120px)]
            overflow-y-auto
          "
        >
          <div className="p-5 space-y-1">
            {menus.map((menu, i) => (
              <div key={i}>
                {menu.dropdown ? (
                  <>
                    <button
                      onClick={() => setMobileSubOpen(!mobileSubOpen)}
                      className="
                        w-full flex items-center justify-between
                        px-4 py-3
                        font-semibold text-xs uppercase tracking-[0.15em]
                        text-white/60
                        hover:text-champagne
                        transition-colors
                      "
                    >
                      {menu.name}

                      <ChevronDown
                        size={14}
                        strokeWidth={1.5}
                        className={`transition-transform duration-200 ${
                          mobileSubOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {mobileSubOpen && (
                      <div className="ml-4 mb-2 border-l border-champagne/10 pl-4">
                        {categories.map((cat) => (
                          <Link
                            key={cat.categoryId}
                            to={`/products?category=${cat.categoryId}`}
                            onClick={() => setIsMobileOpen(false)}
                            className="
                              block py-2.5
                              text-[11px] font-medium text-white/40 uppercase tracking-[0.1em]
                              hover:text-champagne
                              transition-colors
                            "
                          >
                            {cat.categoryName}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={menu.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      block px-4 py-3
                      font-semibold text-xs uppercase tracking-[0.15em]
                      transition-colors
                      ${isActive(menu.path) ? "text-champagne" : "text-white/60 hover:text-champagne"}
                    `}
                  >
                    {menu.name}
                  </Link>
                )}
              </div>
            ))}

            {/* Divider */}
            <div className="h-px bg-champagne/10 my-3" />

            {/* Mobile Room Planner */}
            <Link
              to="/room-planner"
              onClick={() => setIsMobileOpen(false)}
              className="
                flex items-center justify-center gap-2
                py-3
                text-nero text-xs font-bold uppercase tracking-[0.15em]
                bg-champagne
                transition-all duration-300
                hover:shadow-[0_0_25px_rgba(200,169,110,0.3)]
              "
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                <rect x="9" y="13" width="6" height="8" rx="0.8" />
              </svg>
              <span>Thử Nội Thất 3D</span>
            </Link>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rp-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(52,211,153,.75);
          }
          65% {
            box-shadow: 0 0 0 5px rgba(52,211,153,0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(52,211,153,0);
          }
        }
      `}</style>
    </nav>
  );
}
