import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

export default function LifestyleSection() {
  return (
    <section
      id="lifestyle-section"
      className="font-roboto bg-ivory"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px] lg:min-h-[700px]">
        {/* Image Side */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, ease: LUXURY_EASE }}
          className="relative overflow-hidden min-h-[400px] lg:min-h-full"
        >
          <img
            src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1600&auto=format&fit=crop"
            alt="Không gian nội thất sang trọng"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-nero/10 lg:bg-gradient-to-l lg:from-ivory/10 lg:to-transparent" />

          {/* Floating Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5, ease: LUXURY_EASE }}
            className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 bg-nero/90 backdrop-blur-sm px-5 py-3 border border-champagne/20"
          >
            <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-champagne">
              Đã hoàn thiện
            </p>
            <p className="text-white text-lg sm:text-xl font-bold mt-0.5">
              2,500+ không gian
            </p>
          </motion.div>
        </motion.div>

        {/* Content Side */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1, delay: 0.2, ease: LUXURY_EASE }}
          className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-24 py-16 lg:py-20 bg-nero"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-block w-8 h-px bg-champagne" />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-champagne">
              Triết lý thiết kế
            </span>
          </div>

          {/* Headline */}
          <h2
            className="text-white font-extrabold uppercase leading-[0.95] tracking-tight mb-6"
            style={{ fontSize: "clamp(1.75rem, 3.5vw, 3rem)" }}
          >
            Mỗi chi tiết
            <br />
            <span className="text-champagne">đều có ý nghĩa</span>
          </h2>

          {/* Paragraph */}
          <p className="text-white/75 font-normal leading-relaxed mb-8 max-w-md text-sm sm:text-base tracking-wide">
            Chúng tôi tin rằng nội thất không chỉ là đồ vật — đó là nghệ thuật
            kiến tạo không gian sống. Mỗi sản phẩm được chọn lọc kỹ lưỡng, từ
            chất liệu đến đường nét, để mang đến sự hoàn hảo trong từng chi
            tiết.
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-6 mb-10 border-t border-champagne/15 pt-8">
            {[
              { number: "10+", label: "Năm kinh nghiệm" },
              { number: "5K+", label: "Khách hàng" },
              { number: "98%", label: "Hài lòng" },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-champagne text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {stat.number}
                </p>
                <p className="text-white/55 text-[10px] sm:text-xs font-normal tracking-wide mt-1 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link
            to="/products"
            id="lifestyle-cta"
            className="group inline-flex items-center gap-3 bg-champagne text-nero font-bold text-xs sm:text-sm uppercase tracking-[0.15em] px-8 py-4 self-start transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.3)]"
          >
            <span>Khám Phá Sản Phẩm</span>
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
