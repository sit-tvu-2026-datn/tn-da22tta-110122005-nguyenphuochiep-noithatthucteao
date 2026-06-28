import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../../config/api";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

const MONEY_FORMATTER = new Intl.NumberFormat("vi-VN");
function formatMoney(value) {
  return `${MONEY_FORMATTER.format(Math.round(Number(value || 0)))}đ`;
}

function resolveImage(product) {
  if (product?.imageUrls?.length) return product.imageUrls[0];
  if (product?.imageUrl) return product.imageUrl;
  return "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=90&w=600&auto=format&fit=crop";
}

export default function NewArrivalsMarquee() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/api/products")
      .then((res) => {
        const data = res.data || [];
        // Sort by newest (createdAt) and take first 10
        const sorted = [...data]
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || a.createdDate || 0).getTime();
            const dateB = new Date(b.createdAt || b.createdDate || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 10);
        setProducts(sorted);
      })
      .catch(() => setProducts([]));
  }, []);

  if (products.length === 0) return null;

  // Duplicate for seamless loop
  const marqueeItems = [...products, ...products];

  return (
    <section
      id="new-arrivals-marquee"
      className="font-roboto py-20 sm:py-28 bg-ivory overflow-hidden"
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: LUXURY_EASE }}
        className="max-w-7xl mx-auto px-6 sm:px-10 mb-12"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-block w-8 h-px bg-champagne" />
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase text-champagne">
            Mới nhất
          </span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <h2
            className="text-nero font-extrabold uppercase leading-[0.95] tracking-tight"
            style={{ fontSize: "clamp(1.75rem, 4vw, 3.5rem)" }}
          >
            Hàng Mới
            <br />
            Về Liên Tục
          </h2>
          <Link
            to="/products"
            className="text-sm font-semibold tracking-[0.1em] uppercase text-nero hover:text-champagne transition-colors"
          >
            Xem tất cả →
          </Link>
        </div>
      </motion.div>

      {/* Marquee Strip */}
      <div className="relative">
        {/* Left/Right fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-10 bg-gradient-to-r from-ivory to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-10 bg-gradient-to-l from-ivory to-transparent pointer-events-none" />

        <div className="landing-marquee flex gap-5 sm:gap-6 w-max">
          {marqueeItems.map((product, i) => {
            const finalPrice =
              product.discount > 0
                ? product.price * (1 - product.discount / 100)
                : product.price;
            const image = resolveImage(product);

            return (
              <Link
                key={`${product.productId}-${i}`}
                to={`/product/${product.productId}`}
                className="group flex-shrink-0 w-[260px] sm:w-[300px]"
              >
                {/* Image */}
                <div className="relative aspect-[3/4] overflow-hidden bg-white mb-4">
                  <img
                    src={image}
                    alt={product.productName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-nero/0 group-hover:bg-nero/10 transition-colors duration-500" />

                  {product.discount > 0 && (
                    <div className="absolute top-3 left-3 bg-champagne text-nero text-[10px] font-bold px-2.5 py-1 tracking-wide">
                      -{product.discount}%
                    </div>
                  )}
                </div>

                {/* Info */}
                <h3 className="text-nero text-sm font-medium leading-snug line-clamp-1 group-hover:text-champagne transition-colors mb-1.5">
                  {product.productName}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-nero text-sm font-bold">
                    {formatMoney(finalPrice)}
                  </span>
                  {product.discount > 0 && (
                    <span className="text-smoke text-xs line-through">
                      {formatMoney(product.price)}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
