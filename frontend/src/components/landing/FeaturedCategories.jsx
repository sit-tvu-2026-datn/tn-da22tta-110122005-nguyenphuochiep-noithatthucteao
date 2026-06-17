import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import api from "../../config/api";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

// Fallback images for categories
const CATEGORY_IMAGES = [
  "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=1200&auto=format&fit=crop",
];

function getCategoryImage(category, index) {
  if (category.imageUrl) return category.imageUrl;
  return CATEGORY_IMAGES[index % CATEGORY_IMAGES.length];
}

export default function FeaturedCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get("/api/categories")
      .then((res) => setCategories(res.data?.slice(0, 5) || []))
      .catch(() => setCategories([]));
  }, []);

  if (categories.length === 0) return null;

  // Take first 3 for the bento grid
  const featured = categories.slice(0, 3);
  const remaining = categories.slice(3);

  return (
    <section
      id="featured-categories"
      className="font-roboto py-20 sm:py-28 bg-ivory"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: LUXURY_EASE }}
          className="mb-14"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-block w-8 h-px bg-champagne" />
            <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-champagne">
              Danh mục
            </span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <h2
              className="text-nero font-extrabold uppercase leading-[0.95] tracking-tight"
              style={{ fontSize: "clamp(1.75rem, 4vw, 3.5rem)" }}
            >
              Khám Phá
              <br />
              Theo Phong Cách
            </h2>
            <Link
              to="/products"
              className="group inline-flex items-center gap-2 text-sm font-semibold tracking-[0.1em] uppercase text-nero hover:text-champagne transition-colors"
            >
              Xem tất cả
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Large card */}
          {featured[0] && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, ease: LUXURY_EASE }}
              className="md:row-span-2"
            >
              <Link
                to={`/products?category=${featured[0].categoryId}`}
                className="group relative block w-full h-full min-h-[400px] md:min-h-full overflow-hidden bg-nero"
              >
                <img
                  src={getCategoryImage(featured[0], 0)}
                  alt={featured[0].categoryName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nero/80 via-nero/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-10">
                  <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-champagne mb-2 block">
                    Bộ sưu tập
                  </span>
                  <h3
                    className="text-white font-extrabold uppercase tracking-tight mb-4"
                    style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
                  >
                    {featured[0].categoryName}
                  </h3>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-white/70 group-hover:text-champagne transition-colors">
                    Xem thêm
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            </motion.div>
          )}

          {/* Two stacked cards */}
          {featured.slice(1, 3).map((cat, i) => (
            <motion.div
              key={cat.categoryId}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.8,
                delay: (i + 1) * 0.15,
                ease: LUXURY_EASE,
              }}
            >
              <Link
                to={`/products?category=${cat.categoryId}`}
                className="group relative block w-full h-64 sm:h-72 overflow-hidden bg-nero"
              >
                <img
                  src={getCategoryImage(cat, i + 1)}
                  alt={cat.categoryName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-nero/75 via-nero/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-champagne mb-1.5 block">
                    Bộ sưu tập
                  </span>
                  <h3 className="text-white font-bold uppercase tracking-tight text-xl sm:text-2xl mb-3">
                    {cat.categoryName}
                  </h3>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.15em] uppercase text-white/70 group-hover:text-champagne transition-colors">
                    Xem thêm
                    <ArrowRight
                      size={14}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Extra categories as small pills */}
        {remaining.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3, ease: LUXURY_EASE }}
            className="mt-6 flex flex-wrap gap-3"
          >
            {remaining.map((cat) => (
              <Link
                key={cat.categoryId}
                to={`/products?category=${cat.categoryId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-nero/15 text-nero text-xs font-semibold uppercase tracking-[0.12em] hover:bg-nero hover:text-ivory transition-all duration-300"
              >
                {cat.categoryName}
                <ArrowRight size={12} />
              </Link>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
