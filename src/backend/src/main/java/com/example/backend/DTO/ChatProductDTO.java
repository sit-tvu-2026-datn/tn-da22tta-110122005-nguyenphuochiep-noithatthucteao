package com.example.backend.DTO;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Thẻ sản phẩm có CẤU TRÚC mà chatbot trả về cho frontend.
 *
 * Toàn bộ dữ liệu ở đây do BACKEND dựng từ database (nguồn sự thật duy nhất):
 * id, name, price, oldPrice, image, url, category. AI KHÔNG tạo các trường này.
 * Riêng {@code highlights} là lời tư vấn ngắn do AI sinh ra (đã được làm sạch).
 *
 * Frontend render trực tiếp DTO này, KHÔNG parse text, KHÔNG regex link.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatProductDTO {
    /** Mã sản phẩm, ví dụ "DT005". */
    private String id;

    /** Tên hiển thị của sản phẩm. */
    private String name;

    /** Giá bán hiện tại (sau giảm giá) — số tiền khách thực trả. */
    private BigDecimal price;

    /** Giá gốc (gạch ngang). null nếu sản phẩm không giảm giá. */
    private BigDecimal oldPrice;

    /** URL ảnh đại diện (tuyệt đối). */
    private String image;

    /** Đường dẫn nội bộ tới trang chi tiết, ví dụ "/product/DT005". */
    private String url;

    /** Tên danh mục để hiển thị. */
    private String category;

    /** 2-4 ý tư vấn ngắn gọn do AI sinh, không chứa giá/link/HTML. */
    private List<String> highlights;

    // ---- Các trường bổ sung cho type = "product_detail" (null/omit ở thẻ gợi ý) ----

    /** Mô tả sản phẩm (chỉ dùng cho thẻ chi tiết). */
    private String description;

    /** Bảng thông số kỹ thuật (chỉ dùng cho thẻ chi tiết). */
    private List<ChatSpecDTO> specs;

    /** Còn hàng hay không (chỉ dùng cho thẻ chi tiết). */
    private Boolean inStock;
}
