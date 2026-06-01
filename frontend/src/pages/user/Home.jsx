import Slideshow from "../../components/Slideshow";
import Products from "../../components/Products";
import PersonalizedRecommendations from "../../components/PersonalizedRecommendations";

export default function Home() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Slideshow Banner */}
      <section className="mb-8">
        <Slideshow />
      </section>

      {/* Gợi ý sản phẩm cá nhân hóa */}
      <PersonalizedRecommendations />

      {/* Danh sách sản phẩm */}
      {/* Component Products tự quản lý việc hiển thị sản phẩm, phân trang và bộ lọc riêng của nó */}
      <section>
        <Products />
      </section>
    </div>
  );
}

