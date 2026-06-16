import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
      // Reset after 4 seconds
      setTimeout(() => setSubmitted(false), 4000);
    }
  };

  return (
    <section
      id="newsletter-section"
      className="relative font-montserrat py-24 sm:py-32 overflow-hidden bg-nero"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-champagne/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-champagne/30 to-transparent" />

      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #C8A96E 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: LUXURY_EASE }}
        className="relative z-10 max-w-2xl mx-auto px-6 sm:px-10 text-center"
      >
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="inline-block w-8 h-px bg-champagne/50" />
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-champagne/70">
            Kết nối
          </span>
          <span className="inline-block w-8 h-px bg-champagne/50" />
        </div>

        {/* Headline */}
        <h2
          className="text-white font-extrabold uppercase leading-[0.95] tracking-tight mb-4"
          style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}
        >
          Đừng Bỏ Lỡ
          <br />
          <span className="text-champagne">Ưu Đãi Độc Quyền</span>
        </h2>

        {/* Subtitle */}
        <p className="text-white/40 font-light tracking-wide mb-10 text-sm sm:text-base max-w-md mx-auto">
          Đăng ký nhận bản tin để cập nhật bộ sưu tập mới, ưu đãi đặc biệt và
          cảm hứng thiết kế nội thất.
        </p>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto"
        >
          <div className="flex-1 relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn"
              required
              id="newsletter-email"
              className="w-full bg-white/5 border border-champagne/20 text-white placeholder-white/25 text-sm font-light tracking-wide px-5 py-4 outline-none focus:border-champagne/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            id="newsletter-submit"
            className="group inline-flex items-center justify-center gap-2 bg-champagne text-nero font-bold text-xs uppercase tracking-[0.15em] px-8 py-4 transition-all duration-500 hover:shadow-[0_0_30px_rgba(200,169,110,0.25)] disabled:opacity-50"
            disabled={submitted}
          >
            {submitted ? (
              <span>Đã đăng ký ✓</span>
            ) : (
              <>
                <span>Đăng Ký</span>
                <Send
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </>
            )}
          </button>
        </form>

        {/* Trust Note */}
        <p className="text-white/20 text-[10px] font-light tracking-[0.15em] uppercase mt-6">
          Không spam · Hủy đăng ký bất cứ lúc nào
        </p>
      </motion.div>
    </section>
  );
}
