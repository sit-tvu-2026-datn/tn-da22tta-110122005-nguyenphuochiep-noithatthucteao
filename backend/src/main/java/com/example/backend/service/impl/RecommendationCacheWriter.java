package com.example.backend.service.impl;

import com.example.backend.repository.RecommendationCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Thành phần ghi cache gợi ý dùng chung cho toàn bộ Recommendation Engine.
 *
 * <p>Mọi thao tác ghi cache đều đi qua đây để:
 * <ul>
 *   <li>Dùng UPSERT atomic ở tầng DB (INSERT ... ON DUPLICATE KEY UPDATE) thay cho
 *       mẫu delete-then-insert vốn gây Duplicate Key do thứ tự flush của Hibernate
 *       và do race condition khi nhiều request ghi cùng một cache_key.</li>
 *   <li>Chạy trong transaction riêng (REQUIRES_NEW) để nếu việc ghi cache có lỗi thì
 *       cũng KHÔNG làm hỏng (đánh dấu rollback-only) transaction đọc của request,
 *       tránh UnexpectedRollbackException.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationCacheWriter {

    private final RecommendationCacheRepository cacheRepository;

    /**
     * Ghi (hoặc cập nhật) một bản ghi cache theo cacheKey.
     * Không bao giờ ném exception ra ngoài: cache chỉ là tối ưu, lỗi cache không được phá vỡ response.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void put(String cacheKey, String data, LocalDateTime expiresAt) {
        try {
            cacheRepository.upsertCache(cacheKey, data, expiresAt);
        } catch (DataIntegrityViolationException e) {
            // Cực hiếm với ON DUPLICATE KEY UPDATE; nuốt lỗi để request vẫn trả dữ liệu bình thường.
            log.warn("Bỏ qua lỗi ghi cache cho key '{}': {}", cacheKey, e.getMessage());
        }
    }
}
