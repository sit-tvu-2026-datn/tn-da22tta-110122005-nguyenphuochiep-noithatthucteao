import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Home, ShoppingBag, ShieldCheck } from "lucide-react";
import { formatPrice } from "../../utils/price";

/**
 * Trang THANH TOÁN THÀNH CÔNG.
 * Được điều hướng tới sau khi VNPAY/PayPal xác nhận thanh toán hợp lệ và
 * đơn hàng đã được ghi nhận. Nhận dữ liệu qua navigate state (tùy chọn):
 *   { orderId, amount, transactionId }
 */
export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { orderId, amount, transactionId } = state || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 text-center border border-green-100">
        {/* Icon thành công */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-14 w-14 text-green-600" strokeWidth={2.2} />
        </div>
        
        <h1 className="text-2xl font-bold text-green-700 mb-2">
          Cảm ơn bạn đã mua hàng!
        </h1>
        <p className="text-gray-600 mb-1 font-medium">Thanh toán thành công.</p>
        <p className="text-gray-500 mb-6 text-sm">
          Đơn hàng của bạn đã được ghi nhận.
        </p>

        {/* Thông tin đơn (nếu có) */}
        {(orderId || amount != null || transactionId) && (
          <div className="bg-green-50/70 border border-green-100 rounded-2xl p-4 mb-6 space-y-2 text-left">
            {orderId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mã đơn hàng</span>
                <span className="font-semibold text-gray-800 break-all">
                  #{orderId}
                </span>
              </div>
            )}
            {amount != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Số tiền</span>
                <span className="font-bold text-green-700">
                  {formatPrice(amount)}
                </span>
              </div>
            )}
            {transactionId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mã giao dịch</span>
                <span className="font-mono text-xs text-gray-700 break-all">
                  {transactionId}
                </span>
              </div>
            )}
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
            onClick={() => navigate("/purchase")}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white shadow-md shadow-green-200 transition hover:bg-green-700"
          >
            <ShoppingBag className="h-4 w-4" /> Xem đơn hàng của tôi
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Giao dịch được bảo mật an toàn</span>
        </div>
      </div>
    </div>
  );
}
