package com.example.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình cho việc gửi email qua Brevo REST API.
 *
 * Toàn bộ giá trị được đọc từ biến môi trường (application.properties map sang env),
 * KHÔNG hardcode API Key trong source code.
 *
 * Khi deploy Render chỉ BẮT BUỘC cấu hình 3 biến:
 *   - BREVO_API_KEY
 *   - BREVO_SENDER_NAME
 *   - BREVO_SENDER_EMAIL
 * Các giá trị còn lại (api-url, frontend-url, thông tin liên hệ) đều có default.
 */
@Component
@ConfigurationProperties(prefix = "brevo")
@Data
public class BrevoConfig {

    /** API Key của Brevo (env: BREVO_API_KEY). */
    private String apiKey;

    /** Tên người gửi hiển thị trong email (env: BREVO_SENDER_NAME). */
    private String senderName;

    /** Email người gửi đã xác thực trên Brevo (env: BREVO_SENDER_EMAIL). */
    private String senderEmail;

    /** Endpoint gửi email của Brevo. Có default nên không cần cấu hình. */
    private String apiUrl = "https://api.brevo.com/v3/smtp/email";

    /** URL frontend để build các nút "Xem đơn hàng" / "Về trang chủ". */
    private String frontendUrl = "http://localhost:5173";

    // --- Thông tin liên hệ hiển thị ở footer (đều có default) ---
    private String shopHotline = "1900 6789";
    private String shopEmail = "support@interiorshop.vn";
    private String shopFacebook = "https://facebook.com/interiorshop";
    private String shopWebsite = "https://interiorshop.vn";
}
