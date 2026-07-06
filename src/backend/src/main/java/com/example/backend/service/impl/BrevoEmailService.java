package com.example.backend.service.impl;

import com.example.backend.config.BrevoConfig;
import com.example.backend.model.Order;
import com.example.backend.model.Payment;
import com.example.backend.model.User;
import com.example.backend.repository.OrderRepository;
import com.example.backend.repository.PaymentMethodRepository;
import com.example.backend.repository.UserRepository;
import com.example.backend.service.EmailService;
import com.example.backend.service.EmailTemplateBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Gửi email qua REST API của Brevo (https://api.brevo.com/v3/smtp/email).
 *
 * KHÔNG dùng JavaMailSender / SMTP / Gmail.
 *
 * - @Async: gửi ở thread riêng, không làm chậm phản hồi API thanh toán.
 * - @Transactional(readOnly): mở session Hibernate trong thread async để
 *   load lazy (orderDetails, product images) khi build email.
 * - Mọi lỗi được nuốt + ghi log: KHÔNG rollback đơn hàng, KHÔNG crash server.
 */
@Service
public class BrevoEmailService implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(BrevoEmailService.class);

    private final RestTemplate restTemplate;
    private final BrevoConfig brevoConfig;
    private final EmailTemplateBuilder templateBuilder;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final PaymentMethodRepository paymentMethodRepository;

    public BrevoEmailService(RestTemplate restTemplate,
                             BrevoConfig brevoConfig,
                             EmailTemplateBuilder templateBuilder,
                             OrderRepository orderRepository,
                             UserRepository userRepository,
                             PaymentMethodRepository paymentMethodRepository) {
        this.restTemplate = restTemplate;
        this.brevoConfig = brevoConfig;
        this.templateBuilder = templateBuilder;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.paymentMethodRepository = paymentMethodRepository;
    }

    @Override
    @Async
    @Transactional(readOnly = true)
    public void sendOrderConfirmationEmail(String orderId) {
        try {
            if (brevoConfig.getApiKey() == null || brevoConfig.getApiKey().isBlank()) {
                log.warn("Bỏ qua gửi email đơn {}: BREVO_API_KEY chưa được cấu hình.", orderId);
                return;
            }

            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                log.warn("Bỏ qua gửi email: không tìm thấy đơn hàng {}.", orderId);
                return;
            }

            User user = userRepository.findById(order.getUserId()).orElse(null);
            String toEmail = user != null ? user.getEmail() : null;
            if (toEmail == null || toEmail.isBlank()) {
                log.warn("Bỏ qua gửi email đơn {}: không tìm thấy email khách hàng.", orderId);
                return;
            }

            String paymentMethodName = resolvePaymentMethodName(order);
            String html = templateBuilder.buildOrderConfirmation(order, user, paymentMethodName, brevoConfig);
            String subject = "🎉 Xác nhận đơn hàng #" + order.getOrderId() + " - NPH Shop";

            sendEmail(toEmail, user.getFullName(), subject, html);
            log.info("Đã gửi email xác nhận đơn hàng {} tới {}.", orderId, toEmail);
        } catch (Exception e) {
            // Nuốt mọi lỗi: không rollback đơn hàng, không crash server.
            log.error("Gửi email xác nhận đơn hàng {} thất bại: {}", orderId, e.getMessage(), e);
        }
    }

    /** TTL của OTP hiển thị trong email (đồng bộ với PasswordResetService). */
    private static final int OTP_TTL_MINUTES = 10;

    /**
     * Gửi email OTP đặt lại mật khẩu — ĐỒNG BỘ, NÉM lỗi ra ngoài để lớp gọi biết
     * kết quả (không @Async, không nuốt lỗi như email đơn hàng).
     */
    @Override
    public void sendPasswordResetEmail(String toEmail, String toName, String otp) {
        if (brevoConfig.getApiKey() == null || brevoConfig.getApiKey().isBlank()) {
            throw new IllegalStateException("BREVO_API_KEY chưa được cấu hình, không thể gửi email OTP.");
        }
        String html = templateBuilder.buildPasswordResetOtp(toName, otp, OTP_TTL_MINUTES, brevoConfig);
        String subject = "🔐 Mã đặt lại mật khẩu NPH Shop: " + otp;
        sendEmail(toEmail, toName, subject, html);
        log.info("Đã gửi email OTP đặt lại mật khẩu tới {}.", toEmail);
    }

    /** Lấy tên phương thức thanh toán để hiển thị trong email. */
    private String resolvePaymentMethodName(Order order) {
        try {
            Payment payment = order.getPayment();
            String pmId = payment != null ? payment.getPaymentMethodId() : null;
            if (pmId != null) {
                return paymentMethodRepository.findById(pmId)
                        .map(pm -> pm.getName())
                        .orElse(fallbackMethodName(pmId));
            }
        } catch (Exception e) {
            log.debug("Không xác định được phương thức thanh toán cho đơn {}: {}",
                    order.getOrderId(), e.getMessage());
        }
        return "Thanh toán khi nhận hàng (COD)";
    }

    private String fallbackMethodName(String pmId) {
        return switch (pmId) {
            case "PM002" -> "VNPAY";
            case "PM003" -> "PayPal";
            default -> "Thanh toán khi nhận hàng (COD)";
        };
    }

    /** Gọi REST API Brevo để gửi 1 email HTML. */
    private void sendEmail(String toEmail, String toName, String subject, String htmlContent) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("accept", "application/json");
        headers.set("api-key", brevoConfig.getApiKey());

        Map<String, Object> body = new HashMap<>();
        body.put("sender", Map.of(
                "name", brevoConfig.getSenderName() != null ? brevoConfig.getSenderName() : "NPH Shop",
                "email", brevoConfig.getSenderEmail()));
        body.put("to", List.of(Map.of(
                "email", toEmail,
                "name", (toName != null && !toName.isBlank()) ? toName : toEmail)));
        body.put("subject", subject);
        body.put("htmlContent", htmlContent);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response =
                restTemplate.postForEntity(brevoConfig.getApiUrl(), request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new RuntimeException("Brevo API trả về mã " + response.getStatusCode()
                    + " - body: " + response.getBody());
        }
    }
}
