import { Star, TrendingUp } from "lucide-react";
import HeroSection from "../../components/landing/HeroSection";
import BrandBar from "../../components/landing/BrandBar";
import FeaturedCategories from "../../components/landing/FeaturedCategories";
import FlashSaleSection from "../../components/landing/FlashSaleSection";
import PersonalizedRecommendations from "../../components/PersonalizedRecommendations";
import RecommendationCarousel from "../../components/recommend/RecommendationCarousel";
import LifestyleSection from "../../components/landing/LifestyleSection";
import NewArrivalsMarquee from "../../components/landing/NewArrivalsMarquee";
import NewsletterSection from "../../components/landing/NewsletterSection";

export default function Home() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* 1. Hero — Full-viewport cinematic banner */}
      <HeroSection />

      {/* 2. Brand Values — Trust indicators bar */}
      <BrandBar />

      {/* 3. Featured Categories — Nike-style asymmetric grid */}
      <FeaturedCategories />

      {/* 3b. Flash Sale — Ưu đãi có hạn (đồng bộ phong cách trang chủ) */}
      <FlashSaleSection />

      {/* 4. Personalized Recommendations — "Dành riêng cho bạn" (For You) */}
      <PersonalizedRecommendations />

      {/* 4b. Trending — Sản phẩm đang thịnh hành */}
      <RecommendationCarousel
        title="Đang thịnh hành"
        eyebrow="Xu hướng tuần này"
        icon={<TrendingUp size={12} className="text-[#c4aa75]" />}
        endpoint="/api/recommend/trending"
        limit={4}
      />

      {/* 4c. Top Rated — Sản phẩm được đánh giá cao nhất */}
      <RecommendationCarousel
        title="Được đánh giá cao"
        eyebrow="Khách hàng yêu thích"
        icon={<Star size={12} className="text-[#c4aa75]" />}
        endpoint="/api/recommend/top-rated"
        limit={4}
        showRating
      />

      {/* 5. Lifestyle — 50/50 split image + content */}
      <LifestyleSection />

      {/* 6. New Arrivals — Auto-scrolling product marquee */}
      <NewArrivalsMarquee />

      {/* 7. Newsletter — Dark CTA section */}
      <NewsletterSection />
    </div>
  );
}