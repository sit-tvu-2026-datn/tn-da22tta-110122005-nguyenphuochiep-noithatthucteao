package com.example.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class VnPayConfig {

    @Value("${vnpay.url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    @Value("${vnpay.returnUrl:http://localhost:5173/payment-return}")
    private String returnUrl;

    @Value("${vnpay.tmnCode:}")
    private String tmnCode;

    @Value("${vnpay.hashSecret:}")
    private String hashSecret;

    // .trim() để chống khoảng trắng/xuống dòng vô hình khi dán biến môi trường
    // trên Render/Docker — nguyên nhân kinh điển khiến chữ ký sai chỉ trên host.
    public String getPayUrl() { return trim(payUrl); }
    public String getReturnUrl() { return trim(returnUrl); }
    public String getTmnCode() { return trim(tmnCode); }
    public String getHashSecret() { return trim(hashSecret); }

    private static String trim(String v) {
        return v == null ? null : v.trim();
    }
}
