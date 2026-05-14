// src/services/EmailService.js
import api from "../config/api";

export const sendInvoiceEmail = async (orderId) => {
  const token = Cookies.get("jwt");
  const email = Cookies.get("user_email");
  console.log(orderId)
  console.log(email)

  if (!email || !orderId) {
    console.error("Thiếu Email hoặc Order ID để gửi hóa đơn");
    return;
  }

  try {
    await api.post("/api/emails/send-invoice", { orderId, email });
    console.log("Yêu cầu gửi email đã được gửi đi");
  } catch (error) {
    console.error("❌ Lỗi gọi API gửi email:", error);
  }
};