package com.example.backend.repository;

import com.example.backend.model.ProductViewHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository xử lý các thao tác cơ sở dữ liệu đối với lịch sử xem sản phẩm (ProductViewHistory).
 */
@Repository
public interface ProductViewHistoryRepository extends JpaRepository<ProductViewHistory, Long> {

    /**
     * Tìm lịch sử xem sản phẩm cụ thể của người dùng.
     */
    Optional<ProductViewHistory> findByUserIdAndProductId(String userId, String productId);

    /**
     * Lấy danh sách lịch sử xem sản phẩm của người dùng, sắp xếp theo thời gian xem gần nhất giảm dần.
     */
    List<ProductViewHistory> findByUserIdOrderByLastViewedAtDesc(String userId);

    /**
     * Lấy danh sách lịch sử xem một sản phẩm cụ thể của tất cả người dùng.
     */
    List<ProductViewHistory> findByProductId(String productId);

    /**
     * Đếm số lượng sản phẩm khác nhau mà người dùng đã xem.
     */
    @Query("SELECT COUNT(DISTINCT p.productId) FROM ProductViewHistory p WHERE p.userId = :userId")
    long countDistinctProductIdsByUserId(@Param("userId") String userId);

    /**
     * Tổng số lượt xem theo sản phẩm trong khung thời gian gần đây (phục vụ Trending).
     * Trả về danh sách [productId, sumViewCount].
     */
    @Query("SELECT p.productId, SUM(p.viewCount) FROM ProductViewHistory p " +
            "WHERE p.lastViewedAt >= :since GROUP BY p.productId")
    List<Object[]> sumViewCountSince(@Param("since") LocalDateTime since);

    /**
     * Atomic upsert: chèn bản ghi mới hoặc cập nhật nếu đã tồn tại (user_id, product_id).
     * Sử dụng MySQL INSERT ... ON DUPLICATE KEY UPDATE để tránh lỗi Duplicate entry
     * khi nhiều request đồng thời ghi nhận cùng một lượt xem.
     */
    @Modifying
    @Query(value = "INSERT INTO product_view_history (user_id, product_id, view_count, created_at, last_viewed_at) " +
            "VALUES (:userId, :productId, 1, NOW(), NOW()) " +
            "ON DUPLICATE KEY UPDATE view_count = view_count + 1, last_viewed_at = NOW()",
            nativeQuery = true)
    void upsertViewHistory(@Param("userId") String userId, @Param("productId") String productId);
}
