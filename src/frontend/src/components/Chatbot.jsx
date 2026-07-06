import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ShoppingBag,
  RefreshCw,
  Armchair,
  Maximize2,
  Minimize2,
} from "lucide-react";
import api from "../config/api";
import MessageRenderer from "./chat/MessageRenderer";

const STORAGE_KEY = "chat_history_v2";

const GREETING = {
  id: 1,
  type: "text",
  message:
    "Xin chào! Tôi là trợ lý ảo NPH Store. Tôi có thể giúp bạn tìm Sofa, Bàn ăn... hoặc tư vấn thiết kế ngay lập tức!",
  sender: "bot",
};

const FAB_SIZE = 64; // kích thước nút (w-16/h-16)
const EDGE_MARGIN = 24; // khoảng cách tối thiểu tới biên
const POS_STORAGE_KEY = "chat_fab_pos";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const messagesEndRef = useRef(null);

  // --- Vị trí & kéo-thả cho nút chatbot nổi ---
  const [fabPos, setFabPos] = useState(() => {
    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // bỏ qua
    }
    return null; // null = dùng vị trí mặc định (góc dưới phải)
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ active: false, moved: false, offsetX: 0, offsetY: 0 });

  const clampToViewport = (x, y) => {
    const maxX = window.innerWidth - FAB_SIZE - EDGE_MARGIN;
    const maxY = window.innerHeight - FAB_SIZE - EDGE_MARGIN;
    return {
      x: Math.min(Math.max(x, EDGE_MARGIN), maxX),
      y: Math.min(Math.max(y, EDGE_MARGIN), maxY),
    };
  };

  // Giữ nút trong khung nhìn khi resize
  useEffect(() => {
    const onResize = () => {
      setFabPos((prev) => (prev ? clampToViewport(prev.x, prev.y) : prev));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleFabPointerDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleFabPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const x = e.clientX - dragRef.current.offsetX;
    const y = e.clientY - dragRef.current.offsetY;
    dragRef.current.moved = true;
    setIsDragging(true);
    setFabPos(clampToViewport(x, y));
  };

  const handleFabPointerUp = (e) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (!dragRef.current.moved) {
      // Là một cú click -> mở chat
      setIsDragging(false);
      setIsOpen(true);
      return;
    }

    // Snap về biên trái hoặc phải gần nhất
    setFabPos((prev) => {
      if (!prev) return prev;
      const center = prev.x + FAB_SIZE / 2;
      const snappedX =
        center < window.innerWidth / 2
          ? EDGE_MARGIN
          : window.innerWidth - FAB_SIZE - EDGE_MARGIN;
      const next = clampToViewport(snappedX, prev.y);
      try {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // bỏ qua
      }
      return next;
    });
    setIsDragging(false);
  };

  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = sessionStorage.getItem(STORAGE_KEY);
      return savedMessages ? JSON.parse(savedMessages) : [GREETING];
    } catch (error) {
      console.error("Lỗi đọc lịch sử chat:", error);
      return [GREETING];
    }
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    scrollToBottom();
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleClearChat = () => {
    if (window.confirm("Bạn có chắc muốn xóa toàn bộ lịch sử chat không?")) {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem("chat_history"); // dọn key cũ (phiên bản text)
      setMessages([
        {
          id: Date.now(),
          type: "text",
          message: "Đoạn chat đã được làm mới. Bạn cần tìm nội thất gì?",
          sender: "bot",
        },
      ]);
    }
  };

  const handleSendMessage = async (e, textToShow, textToSend = null) => {
    if (e) e.preventDefault();
    const displayMsg = textToShow || inputMsg;
    const apiMsg = textToSend || displayMsg;

    if (!displayMsg?.trim()) return;

    // 1. UI update: Thêm tin nhắn user vào list ngay lập tức
    const newUserMsg = { id: Date.now(), text: displayMsg, sender: "user" };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputMsg("");
    setIsTyping(true);

    // 2. LOGIC MEMORY: Lấy 10 tin nhắn hợp lệ gần nhất làm ngữ cảnh
    const validMessages = messages.filter((msg) => !msg.isError);
    const historySlice = validMessages.slice(-10);

    // Map sang format API yêu cầu. Bot lưu nội dung ở `message`, user ở `text`.
    const historyPayload = historySlice.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content:
        msg.sender === "user" ? msg.text || "" : msg.message ?? msg.text ?? "",
    }));

    // Ngữ cảnh tham chiếu: ID sản phẩm (đúng thứ tự) của lần GỢI Ý gần nhất,
    // để backend map "sản phẩm số 2", "mẫu thứ 3"... -> đúng sản phẩm.
    const lastRecommendation = [...messages]
      .reverse()
      .find(
        (msg) =>
          msg.sender === "bot" &&
          msg.type === "product_recommendation" &&
          Array.isArray(msg.products) &&
          msg.products.length > 0,
      );
    const lastRecommendedProductIds = lastRecommendation
      ? lastRecommendation.products.map((p) => p.id).filter(Boolean)
      : [];

    try {
      const { data } = await api.post("/api/chatbot/ask", {
        message: apiMsg,
        history: historyPayload,
        lastRecommendedProductIds,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          type: data?.type || "text",
          message: data?.message ?? "",
          products: data?.products || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          type: "text",
          message: "Xin lỗi, hiện tại máy chủ đang bận. Vui lòng thử lại sau.",
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const BotAvatar = () => (
    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 text-blue-600 shrink-0 border border-blue-200 self-end mb-1">
      <ShoppingBag size={14} />
    </div>
  );

  const renderMessage = (msg) => {
    // Tin nhắn của người dùng
    if (msg.sender === "user") {
      return (
        <div key={msg.id} className="flex w-full justify-end">
          <div className="max-w-[85%] p-3.5 text-[14px] shadow-sm leading-relaxed bg-blue-600 text-white rounded-2xl rounded-br-sm break-words">
            {msg.text}
          </div>
        </div>
      );
    }

    // Tin nhắn lỗi từ bot
    if (msg.isError) {
      return (
        <div key={msg.id} className="flex w-full justify-start">
          <BotAvatar />
          <div className="max-w-[85%] p-3.5 text-[14px] shadow-sm leading-relaxed rounded-2xl rounded-bl-sm border border-red-200 bg-red-50 text-red-600 break-words">
            {msg.message ?? msg.text}
          </div>
        </div>
      );
    }

    // Tin nhắn bot bình thường -> render theo type (text | product_recommendation)
    return (
      <div key={msg.id} className="flex w-full justify-start">
        <BotAvatar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MessageRenderer message={msg} onNavigate={() => setIsOpen(false)} />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`fixed z-[9999] flex flex-col font-sans transition-all duration-300 origin-bottom-right ${isOpen ? "opacity-100 scale-100 translate-y-0 pointer-events-auto visible" : "opacity-0 scale-90 translate-y-10 pointer-events-none invisible"} bottom-0 right-0 w-full h-[100dvh] rounded-none ${isExpanded ? "sm:bottom-6 sm:right-6 sm:w-[700px] sm:h-[calc(100vh-3rem)] sm:max-h-[900px] sm:rounded-2xl" : "sm:bottom-24 sm:right-6 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-2xl"} shadow-2xl`}>
        <div className="bg-white w-full h-full sm:rounded-2xl overflow-hidden flex flex-col shadow-xl border border-gray-200">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-inner">
                  <Armchair size={20} className="text-white" />
                </div>
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-blue-600 animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-bold text-base text-white tracking-wide">Trợ lý Nội Thất</h3>
                <p className="text-[11px] text-blue-100 font-light flex items-center gap-1">
                  <span className="w-1 h-1 bg-blue-200 rounded-full"></span> Luôn sẵn sàng hỗ trợ
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={handleClearChat} title="Làm mới đoạn chat" className="hover:bg-white/20 p-2 rounded-lg transition-colors text-blue-100 hover:text-white"><RefreshCw size={18} /></button>
              <button onClick={() => setIsExpanded((v) => !v)} title={isExpanded ? "Thu nhỏ" : "Mở rộng"} className="hidden sm:block hover:bg-white/20 p-2 rounded-lg transition-colors text-blue-100 hover:text-white">{isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
              <button onClick={() => setIsOpen(false)} className="hover:bg-red-500/80 p-2 rounded-lg transition-colors text-blue-100 hover:text-white"><X size={20} /></button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-[#f0f2f5] space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            {messages.map((msg) => renderMessage(msg))}
            {isTyping && (
              <div className="flex justify-start items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200/50 flex items-center justify-center mr-2 opacity-50 self-end mb-1"><ShoppingBag size={14} className="text-gray-500" /></div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex items-center gap-1 h-10"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
              {[{ label: "🛋️ Sofa", query: "Tìm Sofa phòng khách..." }, { label: "🍽️ Bàn ăn", query: "Tìm Bàn ăn..." }, { label: "🛏️ Giường", query: "Tìm Giường ngủ gỗ..." }, { label: "📚 Bàn học", query: "Tìm Bàn học sinh..." }].map((item, index) => (
                <button key={index} onClick={(e) => handleSendMessage(e, item.label, item.query)} className="whitespace-nowrap px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-600 font-medium hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">{item.label}</button>
              ))}
            </div>
            <form onSubmit={(e) => handleSendMessage(e, inputMsg)} className="flex gap-2 items-center bg-gray-50 p-1.5 rounded-full border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Bạn cần tìm nội thất gì?" className="flex-1 px-4 py-2 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400" />
              <button type="submit" disabled={!inputMsg.trim() || isTyping} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center w-10 h-10 shadow-md">
                {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>
      <div
        className={`fixed z-50 ${isDragging ? "" : "transition-all duration-500"} ${!isOpen ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-90 pointer-events-none"}`}
        style={
          fabPos
            ? { left: fabPos.x, top: fabPos.y, right: "auto", bottom: "auto" }
            : { right: 24, bottom: 24 }
        }
      >
        <button
          onPointerDown={handleFabPointerDown}
          onPointerMove={handleFabPointerMove}
          onPointerUp={handleFabPointerUp}
          title="Kéo để di chuyển • Nhấn để mở chat"
          className={`group relative flex items-center justify-center w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full shadow-[0_8px_30px_rgb(37,99,235,0.3)] border-4 border-white transition-transform duration-300 active:scale-95 touch-none ${isDragging ? "cursor-grabbing scale-110" : "cursor-grab"}`}
        >
          <MessageCircle size={30} className="text-white" strokeWidth={1.5} />
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5 -mt-1 -mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span></span>
        </button>
      </div>
    </>
  );
}
