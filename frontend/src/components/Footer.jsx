import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-nero text-white/50 mt-auto font-montserrat">
      {/* Top Gold Line */}
      <div className="h-px bg-gradient-to-r from-transparent via-champagne/40 to-transparent" />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">

          {/* Cột 1: Brand */}
          <div className="lg:col-span-1 space-y-5">
            <Link to="/" className="inline-flex items-center gap-1.5">
              <span className="text-xl font-extrabold text-white tracking-[0.02em] uppercase">
                NPH
              </span>
              <span className="text-xl font-extrabold text-champagne tracking-[0.02em] uppercase">
                STORE
              </span>
            </Link>
            <p className="text-sm font-light leading-7 text-white/30 max-w-xs tracking-wide">
              Mang đến không gian sống tiện nghi, hiện đại và đẳng cấp cho ngôi
              nhà của bạn.
            </p>
            {/* Decorative line */}
            <div className="flex items-center gap-2 pt-2">
              <span className="w-8 h-px bg-champagne/40" />
              <span className="text-[9px] font-semibold tracking-[0.3em] uppercase text-champagne/50">
                Est. 2024
              </span>
            </div>
          </div>

          {/* Cột 2: Quick Links */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-champagne mb-6">
              Khám Phá
            </h3>
            <ul className="space-y-3">
              {[
                { name: "Trang chủ", path: "/" },
                { name: "Sản phẩm", path: "/products" },
                { name: "Khuyến mãi", path: "/promotions" },
                { name: "Thử Nội Thất 3D", path: "/room-planner" },
              ].map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="group inline-flex items-center gap-2 text-xs font-medium text-white/35 uppercase tracking-[0.1em] hover:text-champagne transition-colors duration-300"
                  >
                    <ArrowRight
                      size={10}
                      className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                    />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3: Policies */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-champagne mb-6">
              Chính Sách
            </h3>
            <ul className="space-y-3">
              {[
                "Chính sách bảo hành",
                "Đổi trả hàng",
                "Giao hàng & Lắp đặt",
                "Thanh toán",
              ].map((item) => (
                <li key={item}>
                  <span className="text-xs font-medium text-white/35 uppercase tracking-[0.1em] hover:text-champagne transition-colors duration-300 cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 4: Contact */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-champagne mb-6">
              Liên Hệ
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <MapPin
                  size={16}
                  strokeWidth={1.5}
                  className="text-champagne/50 mt-0.5 flex-shrink-0 group-hover:text-champagne transition-colors"
                />
                <span className="text-xs font-light text-white/35 tracking-wide group-hover:text-white/60 transition-colors">
                  Nhị Long, Vĩnh Long
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <Phone
                  size={16}
                  strokeWidth={1.5}
                  className="text-champagne/50 flex-shrink-0 group-hover:text-champagne transition-colors"
                />
                <span className="text-xs font-medium text-white/50 tracking-wide group-hover:text-champagne transition-colors cursor-pointer">
                  0779849012
                </span>
              </li>
              <li className="flex items-center gap-3 group">
                <Mail
                  size={16}
                  strokeWidth={1.5}
                  className="text-champagne/50 flex-shrink-0 group-hover:text-champagne transition-colors"
                />
                <span className="text-xs font-light text-white/35 tracking-wide group-hover:text-champagne transition-colors cursor-pointer">
                  support@nphstore.vn
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-14 pt-6 border-t border-champagne/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-white/20 font-medium tracking-[0.2em] uppercase">
            © {currentYear} NPH Store. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-white/15 font-light tracking-[0.15em] uppercase">
              Thiết kế tại Việt Nam
            </span>
            <span className="w-1 h-1 rounded-full bg-champagne/30" />
            <span className="text-[10px] text-white/15 font-light tracking-[0.15em] uppercase">
              Chất lượng toàn cầu
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
