import { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Chatbot from "../components/Chatbot"; // <--- 1. Import Chatbot
import { Outlet } from "react-router-dom";
import { ArrowUp } from "lucide-react";

export default function MainLayout() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Xử lý sự kiện cuộn
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hàm cuộn lên đầu trang
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-ivory font-montserrat overflow-x-hidden text-nero relative">
      {/* Header cố định */}
      <Header />

      {/* Nội dung chính */}
      <main className="flex-grow w-full pt-[104px] lg:pt-[112px] pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Footer tràn viền */}
      <Footer />

      {/* --- KHU VỰC CÁC WIDGET NỔI --- */}
      
      {/* 2. CHATBOT AI */}
      {/* Component này đã được định vị fixed bottom-24 right-8 bên trong nó */}
      <Chatbot />

      {/* 3. NÚT CUỘN VỀ ĐẦU TRANG */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-8 right-8 z-40 p-3 transition-all duration-500 transform hover:scale-105 focus:outline-none ${
          showScrollTop
            ? "bg-nero text-champagne border border-champagne/20 opacity-100 translate-y-0 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
            : "bg-transparent text-transparent opacity-0 translate-y-10 pointer-events-none"
        }`}
        aria-label="Về đầu trang"
      >
        <ArrowUp size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
}