import { motion } from "framer-motion";
import { Award, Gem, ShieldCheck, Truck } from "lucide-react";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

const values = [
  {
    icon: Gem,
    title: "Thiết Kế Đỉnh Cao",
    desc: "Phong cách tối giản, tinh tế",
  },
  {
    icon: Award,
    title: "Chất Liệu Cao Cấp",
    desc: "Gỗ tự nhiên, da thật nhập khẩu",
  },
  {
    icon: ShieldCheck,
    title: "Bảo Hành 5 Năm",
    desc: "An tâm chất lượng lâu dài",
  },
  {
    icon: Truck,
    title: "Giao Hàng Toàn Quốc",
    desc: "Miễn phí lắp đặt tận nhà",
  },
];

export default function BrandBar() {
  return (
    <section
      id="brand-bar"
      className="w-screen font-montserrat bg-nero border-y border-champagne/15"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: LUXURY_EASE }}
          className="grid grid-cols-2 lg:grid-cols-4"
        >
          {values.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 py-8 lg:py-10 px-4 lg:px-6 ${
                i < values.length - 1
                  ? "lg:border-r border-champagne/10"
                  : ""
              } ${i < 2 ? "border-b lg:border-b-0 border-champagne/10" : ""}`}
            >
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-champagne/25 rounded-sm">
                <item.icon size={20} className="text-champagne" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-white text-xs sm:text-sm font-semibold tracking-wide uppercase">
                  {item.title}
                </h3>
                <p className="text-white/35 text-[10px] sm:text-xs font-light mt-0.5 tracking-wide">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
