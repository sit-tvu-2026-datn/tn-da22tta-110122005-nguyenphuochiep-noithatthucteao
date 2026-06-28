package com.example.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entity luu ho so so thich (User Preference Profile) cua tung nguoi dung.
 * Tong hop tu lich su tuong tac de biet nguoi dung ua thich Category / Material / Color / Origin nao nhat.
 * Du lieu chi tiet duoc luu dang JSON trong cot preference_data de de mo rong them chieu moi.
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    @lombok.ToString.Exclude
    @lombok.EqualsAndHashCode.Exclude
    private User user;

    /**
     * JSON chua 4 map diem so thich da chuan hoa 0..1:
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
