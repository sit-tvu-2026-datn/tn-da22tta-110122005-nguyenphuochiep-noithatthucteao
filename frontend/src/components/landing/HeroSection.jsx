import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

export default function HeroSection() {
  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <section
      id="hero-section"
      className="relative w-screen min-h-[100svh] flex items-center justify-center overflow-hidden font-montserrat -mx-4 sm:-mx-6 lg:-mx-8"
      style={{ marginLeft: "calc(-50vw + 50%)", marginRight: "calc(-50vw + 50%)", width: "100vw" }}
    >
      {/* Background Image with Ken Burns */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 animate-ken-burns"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2832&auto=format&fit=crop')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-nero via-nero/60 to-nero/30" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-nero/50 via-transparent to-transparent" />

      {/* Corner Accents */}
      <div className="absolute top-6 left-6 md:top-10 md:left-10 w-12 h-12 z-10 pointer-events-none border-t border-l border-champagne/40" />
      <div className="absolute top-6 right-6 md:top-10 md:right-10 w-12 h-12 z-10 pointer-events-none border-t border-r border-champagne/40" />
      <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 w-12 h-12 z-10 pointer-events-none border-b border-l border-champagne/40" />
      <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 w-12 h-12 z-10 pointer-events-none border-b border-r border-champagne/40" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: LUXURY_EASE }}
          className="flex items-center justify-center gap-3 mb-6"
        >
          <span className="inline-block w-8 h-px bg-champagne" />
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.3em] uppercase text-champagne">
            Bộ sưu tập 2025
          </span>
          <span className="inline-block w-8 h-px bg-champagne" />
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: LUXURY_EASE }}
          className="text-white font-extrabold uppercase leading-[0.9] tracking-tight mb-6"
          style={{ fontSize: "clamp(2.5rem, 8vw, 7rem)" }}
        >
          Định Hình
          <br />
          <span className="text-champagne">Không Gian</span>
          <br />
          Sống
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: LUXURY_EASE }}
          className="text-white/60 font-light tracking-wide max-w-lg mx-auto mb-10"
          style={{ fontSize: "clamp(0.875rem, 1.5vw, 1.125rem)" }}
        >
          Nội thất cao cấp, thiết kế tối giản, trải nghiệm đỉnh cao cho mọi
          căn nhà.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9, ease: LUXURY_EASE }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/products"
            id="hero-cta-primary"
            className="group relative inline-flex items-center gap-3 bg-champagne text-nero font-bold text-sm uppercase tracking-[0.15em] px-10 py-4 overflow-hidden transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.3)]"
          >
            <span className="relative z-10">Khám Phá Ngay</span>
            <ArrowRight
              size={18}
              className="relative z-10 transition-transform duration-300 group-hover:translate-x-1"
            />
            <span className="absolute inset-0 bg-white/0 group-hover:bg-white/20 transition-colors duration-500" />
          </Link>

          <Link
            to="/room-planner"
            id="hero-cta-secondary"
            className="inline-flex items-center gap-3 border border-white/25 text-white/80 font-medium text-sm uppercase tracking-[0.15em] px-10 py-4 transition-all duration-500 hover:border-champagne/60 hover:text-champagne"
          >
            Thử Nội Thất 3D
          </Link>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        onClick={scrollToContent}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/40 hover:text-champagne transition-colors cursor-pointer"
        aria-label="Cuộn xuống"
      >
        <span className="text-[9px] font-semibold tracking-[0.3em] uppercase">
          Khám phá
        </span>
        <ChevronDown size={20} className="animate-scroll-bounce" />
      </motion.button>
    </section>
  );
}
