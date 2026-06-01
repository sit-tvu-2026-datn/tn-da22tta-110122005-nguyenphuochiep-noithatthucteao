package com.example.backend.repository;

import com.example.backend.model.RecommendationCache;
import org.springframework.data.jpa.repository.JpaRepository;
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
}
