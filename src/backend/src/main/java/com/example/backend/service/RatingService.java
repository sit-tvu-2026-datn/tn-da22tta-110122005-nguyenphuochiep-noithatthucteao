package com.example.backend.service;

import com.example.backend.DTO.RecommendationResponse;

/**
 * Dịch vụ gợi ý sản phẩm được đánh giá cao nhất (Top Rated).
 * Sử dụng công thức Bayesian/IMDB Weighted Rating để xếp hạng công bằng
 * giữa sản phẩm ít review điểm cao và sản phẩm nhiều review.
 */
public interface RatingService {

    /**
     * Lấy danh sách sản phẩm được đánh giá cao nhất theo điểm Bayesian.
     *
     * @param limit số lượng kết quả tối đa
     */
    RecommendationResponse getTopRated(int limit);
}
