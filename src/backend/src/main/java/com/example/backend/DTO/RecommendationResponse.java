package com.example.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * DTO bọc dữ liệu danh sách sản phẩm gợi ý trả về từ API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationResponse {
    private List<RecommendationDTO> recommendations;
    private int totalItems;
    private String recommendationType; // CONTENT_BASED, COLLABORATIVE, HYBRID, POPULAR
    private String message; // Thông điệp/lý do gợi ý (tiếng Việt phục vụ khoá luận)

    public static RecommendationResponse success(List<RecommendationDTO> recommendations, String recommendationType, String message) {
        return RecommendationResponse.builder()
                .recommendations(recommendations)
                .totalItems(recommendations.size())
                .recommendationType(recommendationType)
                .message(message)
                .build();
    }

    public static RecommendationResponse empty(String message) {
        return RecommendationResponse.builder()
                .recommendations(new ArrayList<>())
                .totalItems(0)
                .recommendationType("NONE")
                .message(message)
                .build();
    }
}
