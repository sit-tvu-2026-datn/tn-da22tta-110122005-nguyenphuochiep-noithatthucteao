package com.example.backend.repository;

import com.example.backend.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Integer> {
    // Tìm review theo sản phẩm để hiển thị chi tiết sản phẩm
    List<Review> findByProduct_ProductId(String productId);

    // Tìm review theo user (lịch sử đánh giá)
    List<Review> findByUser_UserId(String userId);

    /**
     * Tổng hợp điểm đánh giá theo sản phẩm (phục vụ Top Rated).
     * Trả về danh sách [productId, avgRating, reviewCount].
     */
    @Query("SELECT r.product.productId, AVG(r.rating), COUNT(r) FROM Review r GROUP BY r.product.productId")
    List<Object[]> aggregateRatings();

    /**
     * Điểm đánh giá trung bình toàn hệ thống (hằng số C trong công thức Bayesian).
     */
    @Query("SELECT AVG(r.rating) FROM Review r")
    Double globalAverageRating();

    /**
     * Đếm số review theo sản phẩm trong khung thời gian gần đây (phục vụ Trending).
     * Trả về danh sách [productId, count].
     */
    @Query("SELECT r.product.productId, COUNT(r) FROM Review r WHERE r.createdAt >= :since GROUP BY r.product.productId")
    List<Object[]> countReviewsSince(@Param("since") LocalDateTime since);
}