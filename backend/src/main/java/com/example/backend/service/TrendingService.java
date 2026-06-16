package com.example.backend.service;

import com.example.backend.DTO.RecommendationResponse;

import java.util.Map;

/**
 * Dịch vụ gợi ý sản phẩm đang thịnh hành (Trending).
 * Tổng hợp lượt xem / thêm giỏ / mua / đánh giá trong khung thời gian gần đây,
 * áp dụng hàm log để giảm thiên lệch và chuẩn hóa điểm về 0..1.
 */
public interface TrendingService {

    /**
     * Lấy danh sách sản phẩm thịnh hành nhất.
     *
     * @param limit số lượng kết quả tối đa
     */
    RecommendationResponse getTrending(int limit);

    /**
     * Trả về bản đồ điểm trending đã chuẩn hóa (productId -> score 0..1).
     * Phục vụ Dynamic Hybrid trộn thành phần Trending vào điểm tổng hợp.
     */
    Map<String, Double> getTrendingScores();
}
