-- =====================================================================
-- V3: Nâng cấp hệ thống Recommendation (For You / Trending / Top Rated /
--     Also Bought / Diversity / Dynamic Hybrid)
--
-- LƯU Ý: Dự án dùng spring.jpa.hibernate.ddl-auto=update nên bảng dưới đây
-- được Hibernate TỰ ĐỘNG tạo từ entity UserPreferenceProfile khi khởi động.
-- File này chỉ mang tính TÀI LIỆU schema + phục vụ môi trường tạo bảng thủ công.
--
-- Các tính năng còn lại (Trending, Top Rated, Also Bought) KHÔNG cần bảng mới:
--   - Trending : tổng hợp từ product_view_history + user_product_interaction
--                + order_details + reviews theo cửa sổ thời gian (time-decay).
--   - Top Rated: tổng hợp AVG(rating), COUNT(*) từ bảng reviews (Bayesian).
--   - Also Bought: co-occurrence tự join trên order_details (cùng order).
-- Kết quả các tính năng này tái sử dụng bảng recommendation_cache sẵn có
-- (cache_key: foryou:{userId}, trending, toprated, alsobought:{productId}).
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_preference_profile (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    -- JSON: { categoryScores, materialScores, colorScores, originScores }, mỗi map value 0..1
    preference_data LONGTEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_preference_user (user_id),
    INDEX idx_preference_user (user_id),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id)
) ENGINE=InnoDB CHARSET=utf8mb4;

-- Gợi ý index hỗ trợ các truy vấn tổng hợp theo thời gian (Trending) nếu cần tối ưu:
-- CREATE INDEX idx_interaction_updated ON user_product_interaction (updated_at);
-- CREATE INDEX idx_view_last_viewed   ON product_view_history (last_viewed_at);
-- CREATE INDEX idx_order_order_date    ON orders (order_date);
-- CREATE INDEX idx_review_created_at   ON reviews (created_at);
