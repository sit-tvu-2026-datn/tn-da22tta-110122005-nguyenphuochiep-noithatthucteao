package com.example.backend.repository;

import com.example.backend.model.RecommendationCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Repository xử lý các thao tác cơ sở dữ liệu đối với bộ nhớ đệm gợi ý sản phẩm (RecommendationCache).
 */
@Repository
public interface RecommendationCacheRepository extends JpaRepository<RecommendationCache, Long> {

    /**
     * Lấy dữ liệu cache hợp lệ (chưa hết hạn) theo cacheKey.
     */
    Optional<RecommendationCache> findByCacheKeyAndExpiresAtAfter(String cacheKey, LocalDateTime now);

    /**
     * Lấy dữ liệu cache theo cacheKey (bao gồm cả hết hạn).
     */
    Optional<RecommendationCache> findByCacheKey(String cacheKey);

    /**
     * Xóa các bản ghi cache đã hết hạn.
     */
    void deleteByExpiresAtBefore(LocalDateTime now);

    /**
     * UPSERT atomic ở tầng DB (MySQL): nếu cache_key đã tồn tại thì UPDATE, chưa có thì INSERT.
     * Tận dụng chính unique key uk_cache_key để DB tự xử lý đụng độ -> không bao giờ
     * phát sinh Duplicate Key Exception, và thread-safe khi nhiều request ghi cùng lúc.
     */
    @Modifying
    @Query(value =
            "INSERT INTO recommendation_cache (cache_key, recommendation_data, created_at, expires_at) " +
            "VALUES (:cacheKey, :data, NOW(), :expiresAt) " +
            "ON DUPLICATE KEY UPDATE " +
            "recommendation_data = VALUES(recommendation_data), " +
            "expires_at = VALUES(expires_at)",
            nativeQuery = true)
    void upsertCache(@Param("cacheKey") String cacheKey,
                     @Param("data") String data,
                     @Param("expiresAt") LocalDateTime expiresAt);
}
