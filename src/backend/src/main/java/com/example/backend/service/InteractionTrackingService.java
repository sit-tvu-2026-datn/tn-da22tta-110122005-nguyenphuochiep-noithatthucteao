package com.example.backend.service;

/**
 * Service theo dõi và ghi nhận tương tác của người dùng với sản phẩm.
 * Lưu trữ lịch sử và tính điểm phục vụ cho các thuật toán gợi ý.
 */
public interface InteractionTrackingService {

    /**
     * Ghi nhận tương tác xem sản phẩm (VIEW - score = 1.0).
     */
    void trackView(String userId, String productId);

    /**
     * Ghi nhận tương tác thêm vào giỏ hàng (ADD_TO_CART - score = 3.0).
     */
    void trackAddToCart(String userId, String productId);

    /**
     * Ghi nhận tương tác mua sản phẩm thành công (PURCHASE - score = 5.0).
     */
    void trackPurchase(String userId, String productId);

    /**
     * Ghi nhận tương tác đánh giá sản phẩm (REVIEW - score = rating 1-5).
     */
    void trackReview(String userId, String productId, int rating);
}
