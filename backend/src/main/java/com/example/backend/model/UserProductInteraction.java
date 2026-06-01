package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity lưu trữ các tương tác chi tiết giữa người dùng và sản phẩm.
 * Phục vụ cho thuật toán gợi ý lọc cộng tác (Collaborative Filtering).
 * Điểm tương tác (interactionScore): VIEW = 1.0, ADD_TO_CART = 3.0, REVIEW = 4.0, PURCHASE = 5.0.
 */
@Entity
@Table(
    name = "user_product_interaction",
    indexes = {
        @Index(name = "idx_interaction_user", columnList = "user_id"),
        @Index(name = "idx_interaction_product", columnList = "product_id"),
        @Index(name = "idx_interaction_type", columnList = "interaction_type")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProductInteraction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    @Column(name = "product_id", nullable = false, length = 50)
    private String productId;

    @Column(name = "interaction_score", nullable = false)
    private double interactionScore;

    @Column(name = "interaction_type", nullable = false, length = 20)
    private String interactionType; // VIEW, ADD_TO_CART, PURCHASE, REVIEW

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", referencedColumnName = "product_id", insertable = false, updatable = false)
    private Product product;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
