package com.example.backend.DTO;

import com.example.backend.model.Product;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * DTO đại diện cho thông tin một sản phẩm gợi ý được gửi về client.
 * Bao gồm cả điểm tương đồng để hiển thị độ phù hợp với người dùng.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationDTO {
    private String productId;
    private String productName;
    private BigDecimal price;
    private BigDecimal discount;
    private List<String> imageUrls;
    private String categoryName;
    private String color;
    private String material;
    private double similarityScore; // Điểm tương quan/tương đồng (0.0 -> 1.0)
    private String recommendationType; // CONTENT_BASED, COLLABORATIVE, HYBRID, POPULAR

    /**
     * Constructor chuyển đổi từ thực thể Product.
     */
    public RecommendationDTO(Product product) {
        this.productId = product.getProductId();
        this.productName = product.getProductName();
        this.price = product.getPrice();
        this.discount = product.getDiscount();
        if (product.getImages() != null && !product.getImages().isEmpty()) {
            this.imageUrls = product.getImages().stream()
                    .map(com.example.backend.model.ProductImage::getUrl)
                    .collect(Collectors.toList());
        } else {
            this.imageUrls = new ArrayList<>();
        }
        if (product.getCategory() != null) {
            this.categoryName = product.getCategory().getCategoryName();
        } else {
            this.categoryName = "";
        }
        this.color = product.getColor();
        this.material = product.getMaterial();
    }
}
