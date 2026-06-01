package com.example.backend.component;

import com.example.backend.repository.RecommendationCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Component Scheduler tự động chạy định kỳ để dọn dẹp các cache gợi ý đã hết hạn trong database.
 * Tránh việc phình to kích thước bảng recommendation_cache theo thời gian.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RecommendationCacheScheduler {

    private final RecommendationCacheRepository cacheRepository;

    /**
     * Định kỳ mỗi 1 giờ (3600000 milliseconds) chạy dọn dẹp một lần.
     */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void cleanExpiredCaches() {
        log.info("Bắt đầu tiến trình dọn dẹp cache gợi ý sản phẩm hết hạn...");
        try {
            LocalDateTime now = LocalDateTime.now();
            cacheRepository.deleteByExpiresAtBefore(now);
            log.info("Dọn dẹp cache hết hạn thành công tại thời điểm: {}", now);
        } catch (Exception e) {
            log.error("Lỗi xảy ra trong quá trình dọn dẹp cache gợi ý sản phẩm", e);
        }
    }
}
