package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity lưu hồ sơ sở thích (User Preference Profile) của từng người dùng.
 * Tổng hợp từ lịch sử tương tác để biết người dùng ưa thích Category / Material / Color / Origin nào nhất.
 * Dữ liệu chi tiết được lưu dạng JSON trong cột preference_data để dễ mở rộng thêm chiều mới.
 */
@Entity
@Table(
    name = "user_preference_profile",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_preference_user", columnNames = {"user_id"})
    },
    indexes = {
        @Index(name = "idx_preference_user", columnList = "user_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferenceProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, length = 50)
    private String userId;

    /**
     * JSON chứa 4 map điểm sở thích đã chuẩn hóa 0..1:
     * { "categoryScores": {...}, "materialScores": {...}, "colorScores": {...}, "originScores": {...} }
     */
    @Column(name = "preference_data", nullable = false, columnDefinition = "LONGTEXT")
    private String preferenceData;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
