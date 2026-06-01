package com.example.backend.service;

import com.example.backend.DTO.RecommendationResponse;

/**
 * Service xử lý thuật toán gợi ý dựa trên đặc tính sản phẩm (Content-Based Filtering).
 * Sử dụng kỹ thuật TF-IDF và độ tương đồng Cosine (Cosine Similarity).
 */
public interface ContentBasedService {

    /**
     * Lấy danh sách sản phẩm tương tự dựa trên đặc tính sản phẩm mục tiêu.
     *
     * @param productId Mã sản phẩm cần tìm gợi ý tương tự
     * @param limit     Số lượng sản phẩm gợi ý tối đa cần trả về
     * @return RecommendationResponse chứa danh sách sản phẩm gợi ý
     */
    RecommendationResponse getContentBasedRecommendations(String productId, int limit);

    /**
     * Xóa cache bộ nhớ đệm và yêu cầu tính toán lại ma trận TF-IDF.
     */
    void invalidateCache();
}
