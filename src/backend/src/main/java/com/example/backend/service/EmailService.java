package com.example.backend.service;

public interface EmailService {

    /**
     * Gửi email xác nhận đơn hàng cho khách (địa chỉ email lấy từ tài khoản chủ đơn).
     * Được gọi tự động sau khi thanh toán VNPAY/PayPal thành công hoặc đặt hàng COD.
     *
     * Thực hiện bất đồng bộ, nuốt mọi lỗi (chỉ ghi log) để KHÔNG ảnh hưởng đơn hàng.
     */
    void sendOrderConfirmationEmail(String orderId);

    /**
     * Gửi email chứa mã OTP đặt lại mật khẩu.
     *
     * KHÁC với email đơn hàng: chạy ĐỒNG BỘ và NÉM lỗi ra ngoài để lớp gọi
     * (PasswordResetService) biết email có gửi được hay không mà báo cho người dùng.
     *
     * @param toEmail email người nhận
     * @param toName  tên hiển thị (có thể null)
     * @param otp     mã OTP 6 chữ số
     */
    void sendPasswordResetEmail(String toEmail, String toName, String otp);
}
