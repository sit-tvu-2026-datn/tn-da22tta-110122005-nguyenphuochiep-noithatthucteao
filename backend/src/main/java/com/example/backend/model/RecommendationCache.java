package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity dùng để lưu trữ cache kết quả gợi ý sản phẩm cho từng người dùng/sản phẩm.
 * Tránh việc tính toán lại thuật toán quá nhiều lần gây tải cho hệ thống.
 */
@Entity
@Table(
    name = "recommendation_cache",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_cache_key", columnNames = {"cache_key"})
    },
    indexes = {
        @Index(name = "idx_cache_key", columnList = "cache_key"),
        @Index(name = "idx_cache_expires", columnList = "expires_at")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cache_key", nullable = false, length = 255)
    private String cacheKey; // content:{productId} hoặc collaborative:{userId} hoặc hybrid:{userId} hoặc popular

    @Column(name = "recommendation_data", nullable = false, columnDefinition = "LONGTEXT")
    private String recommendationData; // Dữ liệu JSON dạng chuỗi lưu danh sách sản phẩm gợi ý

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt; // Thời điểm cache hết hiệu lực

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
