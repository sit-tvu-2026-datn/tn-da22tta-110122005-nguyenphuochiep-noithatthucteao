package com.example.backend.service;

import com.example.backend.DTO.RecommendationResponse;

/**
 * Service tổng hợp và điều phối các thuật toán gợi ý sản phẩm.
 * Lựa chọn phương pháp phù hợp dựa trên dữ liệu lịch sử của người dùng (Hybrid Recommendation).
 */
public interface RecommendationService {

    /**
     * Gợi ý sản phẩm tương tự dựa trên đặc tính sản phẩm (Content-Based Filtering).
     */
    RecommendationResponse getContentBased(String productId, int limit);

    /**
     * Gợi ý sản phẩm dựa trên hành vi tương tác cộng tác (Collaborative Filtering).
     */
    RecommendationResponse getCollaborative(String userId, int limit);

    /**
     * Gợi ý sản phẩm kết hợp (Hybrid Recommendation) giữa lọc cộng tác và đặc tính nội dung.
     * Sử dụng logic ưu tiên:
     * - Nếu là người dùng mới (chưa đủ 3 tương tác): Gợi ý theo sản phẩm xem gần nhất (Content-Based) hoặc sản phẩm phổ biến.
     * - Nếu là người dùng cũ: Kết hợp điểm từ Collaborative Filtering (60%) và Content-Based (40%).
     */
    RecommendationResponse getHybrid(String userId, int limit);

    /**
     * Gợi ý sản phẩm phổ biến (bán chạy nhất) hoặc sản phẩm mới nhất làm fallback.
     */
    RecommendationResponse getPopular(int limit);
}
