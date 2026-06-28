package com.example.backend.DTO;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Phản hồi CÓ CẤU TRÚC của chatbot gửi về frontend.
 *
 * Frontend chọn cách render dựa trên {@code type}:
 * - "text": chỉ hiển thị {@code message} dạng chat thường.
 * - "product_recommendation": hiển thị {@code message} + danh sách {@code products} (ProductCarousel).
 *
 * Thiết kế này tách biệt hoàn toàn: dữ liệu sản phẩm (backend) / nội dung tư vấn (AI) /
 * hiển thị (frontend). Có thể mở rộng thêm type về sau (product_comparison,
 * room_design_suggestion, ar_preview, ...).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatResponse {

    public static final String TYPE_TEXT = "text";
    public static final String TYPE_PRODUCT_RECOMMENDATION = "product_recommendation";
    public static final String TYPE_PRODUCT_DETAIL = "product_detail";

    /** Loại phản hồi: "text" | "product_recommendation" | "product_detail". */
    private String type;

    /** Lời tư vấn dạng văn bản thuần (không markdown, không HTML). */
    private String message;

    /** Danh sách sản phẩm; null khi type = "text". */
    private List<ChatProductDTO> products;

    /** Phản hồi chỉ gồm văn bản (chào hỏi, hỏi đáp thông số, từ chối, không có SP phù hợp). */
    public static ChatResponse text(String message) {
        return new ChatResponse(TYPE_TEXT, message, null);
    }

    /** Phản hồi kèm danh sách sản phẩm đề xuất. */
    public static ChatResponse recommendation(String message, List<ChatProductDTO> products) {
        return new ChatResponse(TYPE_PRODUCT_RECOMMENDATION, message, products);
    }

    /** Phản hồi chi tiết MỘT sản phẩm (khi khách tham chiếu theo số thứ tự). */
    public static ChatResponse detail(String message, ChatProductDTO product) {
        return new ChatResponse(TYPE_PRODUCT_DETAIL, message, List.of(product));
    }
}
