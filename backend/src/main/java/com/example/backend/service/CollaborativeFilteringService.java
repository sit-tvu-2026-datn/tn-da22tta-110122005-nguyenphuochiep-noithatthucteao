package com.example.backend.service;

import com.example.backend.DTO.RecommendationResponse;

/**
 * Service xử lý thuật toán gợi ý dựa trên lọc cộng tác (Item-Based Collaborative Filtering).
 * Gợi ý sản phẩm cho người dùng dựa trên hành vi tương tác lịch sử của họ và của các người dùng khác.
 */
public interface CollaborativeFilteringService {

    /**
     * Lấy gợi ý lọc cộng tác cho một người dùng cụ thể.
     *
     * @param userId Mã người dùng cần gợi ý
     * @param limit  Số lượng gợi ý tối đa
     * @return RecommendationResponse chứa danh sách sản phẩm gợi ý
     */
    RecommendationResponse getCollaborativeRecommendations(String userId, int limit);

    /**
     * Lấy danh sách sản phẩm thường được mua chung với một sản phẩm ("Khách hàng cũng mua").
     * Dựa trên co-occurrence trong cùng đơn hàng; fallback về Content-Based nếu thiếu dữ liệu.
     *
     * @param productId Mã sản phẩm đang xem
     * @param limit     Số lượng gợi ý tối đa
     */
    RecommendationResponse getAlsoBought(String productId, int limit);

    /**
     * Xóa các cache tính toán lọc cộng tác.
     */
    void invalidateCache();
}
