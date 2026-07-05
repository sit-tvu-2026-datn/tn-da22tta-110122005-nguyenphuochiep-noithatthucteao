package com.example.backend.service;

public interface EmailService {

    /**
     * Gửi email xác nhận đơn hàng cho khách (địa chỉ email lấy từ tài khoản chủ đơn).
     * Được gọi tự động sau khi thanh toán VNPAY/PayPal thành công hoặc đặt hàng COD.
     *
     * Thực hiện bất đồng bộ, nuốt mọi lỗi (chỉ ghi log) để KHÔNG ảnh hưởng đơn hàng.
     */
    void sendOrderConfirmationEmail(String orderId);
}
