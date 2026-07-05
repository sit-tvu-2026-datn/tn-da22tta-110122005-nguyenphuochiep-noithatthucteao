import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { XCircle, Home, ShoppingCart, RotateCcw } from "lucide-react";

/**
 * Trang THANH TOÁN THẤT BẠI.
 * Hiển thị khi: người dùng hủy thanh toán, sai chữ ký, timeout, VNPAY trả lỗi,
 * hoặc lỗi lưu đơn. Nhận lý do qua navigate state (tùy chọn): { reason }
 */
export default function PaymentFailed() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const reason = state?.reason;

  // Xóa đơn hàng tạm đang chờ (nếu có) để lần đặt hàng sau không bị dính
  // dữ liệu cũ làm giỏ hàng/checkout hiển thị sai hoặc trống.
  useEffect(() => {
    sessionStorage.removeItem("pendingOrder");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center border border-red-100">
        {/* Icon thất bại */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <XCircle className="h-14 w-14 text-red-600" strokeWidth={2.2} />
        </div>
        
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Thanh toán thất bại
        </h1>
        <p className="text-gray-600 mb-1 font-medium">
          Giao dịch chưa hoàn tất.
        </p>
        <p className="text-gray-500 mb-6 text-sm">Bạn có thể thử lại.</p>

        {reason && (
          <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-sm text-red-600 break-words">{reason}</p>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </button>
          <button
            onClick={() => navigate("/cart")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white shadow-md shadow-red-200 transition hover:bg-red-700"
          >
            <ShoppingCart className="h-4 w-4" /> Quay lại giỏ hàng
          </button>
        </div>        
      </div>
    </div>
  );
}
