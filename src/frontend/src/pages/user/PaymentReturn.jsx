import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { message } from "antd";
import { CheckCircle, XCircle, Loader2, ShieldCheck } from "lucide-react";
import Cookies from "js-cookie";
import { AuthContext } from "../../context/AuthContext";
import api from "../../config/api";

const generateTransactionId = () =>
  "TM" + Math.random().toString(36).substring(2, 12).toUpperCase();

export default function PaymentReturn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const hasFetched = useRef(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Đang xử lý giao dịch..."
  );
  const token = Cookies.get("jwt");

  // Lấy mã giao dịch từ URL
  const queryParams = new URLSearchParams(location.search);
  const vnpTransactionNo = queryParams.get("vnp_TransactionNo");

  // [QUAN TRỌNG] Lấy dữ liệu đã được build sẵn từ Checkout
  const pendingOrder = JSON.parse(
    sessionStorage.getItem("pendingOrder") || "{}"
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const queryParams = new URLSearchParams(location.search);
    const transactionIdFromVNPAY = queryParams.get("vnp_TransactionNo");
    const responseCode = queryParams.get("vnp_ResponseCode");

    if (!responseCode) {
      navigate("/payment/failed", {
        replace: true,
        state: { reason: "Không tìm thấy dữ liệu giao dịch." },
      });
      return;
    }

    const fetchPaymentResult = async () => {
      try {
        // [BẢO MẬT] Xác thực chữ ký (vnp_SecureHash) ở BACKEND trước khi tạo đơn.
        // Truyền NGUYÊN chuỗi query VNPAY trả về (location.search) để backend verify
        // HMAC — KHÔNG dùng axios params để tránh bị re-encode làm sai chữ ký.
        const { data: verifyResult } = await api.get(
          `/api/vnpay/return${location.search}`
        );

        // success = chữ ký hợp lệ VÀ vnp_ResponseCode/vnp_TransactionStatus == "00".
        // Nếu chữ ký sai (giả mạo) hoặc thanh toán thất bại -> KHÔNG tạo đơn.
        if (!verifyResult?.success) {
          navigate("/payment/failed", {
            replace: true,
            state: {
              reason:
                verifyResult?.message ||
                "Giao dịch không thành công hoặc đã bị hủy.",
            },
          });
          return;
        }

        // Kiểm tra xem dữ liệu trong Session có hợp lệ không
        if (!pendingOrder || !pendingOrder.orderDetails) {
          throw new Error("Mất dữ liệu đơn hàng (Session expired).");
        }

        setLoadingMessage("Thanh toán thành công! Đang lưu đơn hàng...");

        // [SỬA ĐỔI] Sử dụng trực tiếp pendingOrder từ Checkout, không build lại
        const orderPayload = {
          ...pendingOrder,
          transactionId: transactionIdFromVNPAY || generateTransactionId(),
          // Đảm bảo status là pending khi lưu
          orderStatus: "pending",
        };

        // Gọi API tạo đơn hàng
        const apiEndpoint = pendingOrder.oldOrderIds?.length
          ? "/api/orders/replace"
          : "/api/orders";

        const { data: orderData } = await api.post(apiEndpoint, orderPayload);
        const createdOrderId = orderData.orderId;

        // Gọi API lưu thanh toán
        const paymentPayload = {
          orderId: createdOrderId,
          paymentMethodId: "PM002",
          transactionId: transactionIdFromVNPAY,
          amount: pendingOrder.totalAmount,
          paymentStatus: "Completed",
        };

        await api.post("/api/payments", paymentPayload);

        // Xóa session sau khi thành công
        sessionStorage.removeItem("pendingOrder");

        // Email xác nhận được BACKEND tự động gửi (Brevo API) sau khi lưu payment.
        // Frontend không cần gọi gửi email nữa để tránh gửi trùng.

        // Điều hướng sang trang Thanh toán thành công
        navigate("/payment/success", {
          replace: true,
          state: {
            orderId: createdOrderId,
            amount: pendingOrder.totalAmount,
            transactionId: transactionIdFromVNPAY,
          },
        });
      } catch (err) {
        console.error(err);
        navigate("/payment/failed", {
          replace: true,
          state: {
            reason:
              "Đã xảy ra lỗi khi ghi nhận đơn hàng: " +
              (err.message || "Vui lòng liên hệ CSKH."),
          },
        });
      }
    };

    fetchPaymentResult();
  }, []);

  // UI Helper
  const getStatusUI = () => {
    const msg = loadingMessage.toLowerCase();
    if (msg.includes("thất bại") || msg.includes("lỗi")) {
      return {
        icon: <XCircle className="w-16 h-16 text-red-500 mb-4" />,
        color: "text-red-600",
        subText: "Vui lòng kiểm tra lại thông tin hoặc liên hệ hỗ trợ.",
      };
    }
    if (msg.includes("thành công")) {
      return {
        icon: <CheckCircle className="w-16 h-16 text-green-500 mb-4" />,
        color: "text-green-600",
        subText: "Giao dịch đã được ghi nhận.",
      };
    }
    return {
      icon: <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-4" />,
      color: "text-blue-600",
      subText: "Vui lòng không tắt trình duyệt...",
    };
  };

  const statusUI = getStatusUI();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {contextHolder}

      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-gray-100">
        <div className="flex justify-center">{statusUI.icon}</div>

        <h2 className={`text-xl font-bold mb-2 ${statusUI.color}`}>
          {loadingMessage}
        </h2>

        <p className="text-gray-500 mb-6 text-sm">{statusUI.subText}</p>

        {vnpTransactionNo && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              Mã giao dịch VNPAY
            </p>
            <p className="font-mono font-medium text-gray-700 break-all">
              {vnpTransactionNo}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Giao dịch được bảo mật an toàn</span>
        </div>
      </div>
    </div>
  );
}
