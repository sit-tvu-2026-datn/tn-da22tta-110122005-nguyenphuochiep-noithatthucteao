-- V2: Tạo các bảng phục vụ hệ thống gợi ý sản phẩm cá nhân hóa

-- 1. Bảng lưu trữ lịch sử xem sản phẩm của người dùng
CREATE TABLE IF NOT EXISTS product_view_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Mã định danh tự tăng',
    user_id VARCHAR(50) NOT NULL COMMENT 'Mã người dùng, liên kết bảng USERS',
    product_id VARCHAR(50) NOT NULL COMMENT 'Mã sản phẩm, liên kết bảng products',
    view_count INT NOT NULL DEFAULT 1 COMMENT 'Số lượt xem sản phẩm này',
    last_viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm xem sản phẩm gần nhất',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm bắt đầu xem sản phẩm',
    
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_product_view (user_id, product_id),
    INDEX idx_view_user (user_id),
    INDEX idx_view_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lịch sử xem sản phẩm của người dùng';

-- 2. Bảng lưu trữ điểm tương tác giữa người dùng và sản phẩm
CREATE TABLE IF NOT EXISTS user_product_interaction (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Mã định danh tự tăng',
    user_id VARCHAR(50) NOT NULL COMMENT 'Mã người dùng, liên kết bảng USERS',
    product_id VARCHAR(50) NOT NULL COMMENT 'Mã sản phẩm, liên kết bảng products',
    interaction_score DOUBLE NOT NULL DEFAULT 0.0 COMMENT 'Điểm tương tác tương ứng hành vi',
    interaction_type VARCHAR(20) NOT NULL COMMENT 'Loại tương tác (VIEW, ADD_TO_CART, REVIEW, PURCHASE)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tương tác tạo ra',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật tương tác',
    
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    INDEX idx_interaction_user (user_id),
    INDEX idx_interaction_product (product_id),
    INDEX idx_interaction_type (interaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Chi tiết điểm hành vi tương tác của người dùng';

-- 3. Bảng lưu trữ bộ nhớ đệm (cache) kết quả gợi ý
CREATE TABLE IF NOT EXISTS recommendation_cache (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Mã định danh tự tăng',
    cache_key VARCHAR(255) NOT NULL UNIQUE COMMENT 'Mã khóa cache đặc trưng',
    recommendation_data LONGTEXT NOT NULL COMMENT 'Dữ liệu JSON lưu danh sách sản phẩm gợi ý',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo cache',
    expires_at DATETIME NOT NULL COMMENT 'Thời gian cache hết hiệu lực',
    
    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bộ nhớ đệm kết quả thuật toán gợi ý';
