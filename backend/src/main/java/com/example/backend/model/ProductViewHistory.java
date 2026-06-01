package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity lưu trữ lịch sử xem sản phẩm của người dùng.
 * Phục vụ cho thuật toán gợi ý dựa trên nội dung (Content-Based Filtering).
 */
@Entity
@Table(
    name = "product_view_history",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_product_view", columnNames = {"user_id", "product_id"})
    },
    indexes = {
        @Index(name = "idx_view_user", columnList = "user_id"),
        @Index(name = "idx_view_product", columnList = "product_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductViewHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "product_id", nullable = false, length = 50)
    private String productId;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private int viewCount = 1;

    @Column(name = "last_viewed_at")
    private LocalDateTime lastViewedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", referencedColumnName = "product_id", insertable = false, updatable = false)
    private Product product;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastViewedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastViewedAt = LocalDateTime.now();
    }
}
