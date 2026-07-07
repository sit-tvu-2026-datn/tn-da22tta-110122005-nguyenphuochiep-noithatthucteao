package com.example.backend.service.impl;

import com.example.backend.model.UserProductInteraction;
import com.example.backend.repository.ProductViewHistoryRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.repository.UserProductInteractionRepository;
import com.example.backend.service.InteractionTrackingService;
import com.example.backend.service.UserPreferenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Triển khai lớp InteractionTrackingService để ghi nhận các hành vi của người dùng
 * và tự động làm mới bộ nhớ đệm (cache) gợi ý cá nhân hóa tương ứng.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InteractionTrackingServiceImpl implements InteractionTrackingService {

    private final ProductViewHistoryRepository viewHistoryRepository;
    private final UserProductInteractionRepository interactionRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final UserPreferenceService userPreferenceService;

    @Override
    @Transactional
    public void trackView(String userId, String productId) {
        log.info("Ghi nhận lượt xem sản phẩm: userId={}, productId={}", userId, productId);
        if (userId == null || productId == null) return;

        try {
            // 1. Cập nhật bảng Lịch sử xem (product_view_history)
            // Sử dụng upsert nguyên tử (INSERT ... ON DUPLICATE KEY UPDATE)
            // để tránh lỗi Duplicate entry khi có request đồng thời.
            viewHistoryRepository.upsertViewHistory(userId, productId);

            // 2. Ghi nhận/cập nhật bảng điểm Tương tác (user_product_interaction)
            List<UserProductInteraction> interactions = interactionRepository.findByUserIdAndProductId(userId, productId);
            Optional<UserProductInteraction> viewInterOpt = interactions.stream()
                    .filter(i -> "VIEW".equals(i.getInteractionType()))
                    .findFirst();

            if (viewInterOpt.isPresent()) {
                UserProductInteraction inter = viewInterOpt.get();
                inter.setUpdatedAt(LocalDateTime.now());
                interactionRepository.save(inter);
            } else {
                UserProductInteraction inter = UserProductInteraction.builder()
                        .userId(userId)
                        .productId(productId)
                        .interactionScore(1.0) // Trọng số VIEW = 1.0
                        .interactionType("VIEW")
                        .build();
                interactionRepository.save(inter);
            }

            // 3. Xóa cache của người dùng để tính toán lại gợi ý mới
            invalidateUserCaches(userId);

        } catch (Exception e) {
            log.error("Lỗi khi ghi nhận lượt xem sản phẩm: userId={}, productId={}", userId, productId, e);
        }
    }

    @Override
    @Transactional
    public void trackAddToCart(String userId, String productId) {
        log.info("Ghi nhận tương tác Thêm vào giỏ hàng: userId={}, productId={}", userId, productId);
        if (userId == null || productId == null) return;

        try {
            List<UserProductInteraction> interactions = interactionRepository.findByUserIdAndProductId(userId, productId);
            Optional<UserProductInteraction> cartInterOpt = interactions.stream()
                    .filter(i -> "ADD_TO_CART".equals(i.getInteractionType()))
                    .findFirst();

            if (cartInterOpt.isPresent()) {
                UserProductInteraction inter = cartInterOpt.get();
                inter.setUpdatedAt(LocalDateTime.now());
                interactionRepository.save(inter);
            } else {
                UserProductInteraction inter = UserProductInteraction.builder()
                        .userId(userId)
                        .productId(productId)
                        .interactionScore(3.0) // Trọng số ADD_TO_CART = 3.0
                        .interactionType("ADD_TO_CART")
                        .build();
                interactionRepository.save(inter);
            }

            invalidateUserCaches(userId);

        } catch (Exception e) {
            log.error("Lỗi khi ghi nhận thêm vào giỏ hàng: userId={}, productId={}", userId, productId, e);
        }
    }

    @Override
    @Transactional
    public void trackPurchase(String userId, String productId) {
        log.info("Ghi nhận tương tác Mua hàng thành công: userId={}, productId={}", userId, productId);
        if (userId == null || productId == null) return;

        try {
            List<UserProductInteraction> interactions = interactionRepository.findByUserIdAndProductId(userId, productId);
            Optional<UserProductInteraction> purchaseInterOpt = interactions.stream()
                    .filter(i -> "PURCHASE".equals(i.getInteractionType()))
                    .findFirst();

            if (purchaseInterOpt.isPresent()) {
                UserProductInteraction inter = purchaseInterOpt.get();
                inter.setUpdatedAt(LocalDateTime.now());
                interactionRepository.save(inter);
            } else {
                UserProductInteraction inter = UserProductInteraction.builder()
                        .userId(userId)
                        .productId(productId)
                        .interactionScore(5.0) // Trọng số PURCHASE = 5.0
                        .interactionType("PURCHASE")
                        .build();
                interactionRepository.save(inter);
            }

            invalidateUserCaches(userId);

        } catch (Exception e) {
            log.error("Lỗi khi ghi nhận mua hàng: userId={}, productId={}", userId, productId, e);
        }
    }

    @Override
    @Transactional
    public void trackReview(String userId, String productId, int rating) {
        log.info("Ghi nhận tương tác Đánh giá: userId={}, productId={}, rating={}", userId, productId, rating);
        if (userId == null || productId == null) return;

        try {
            List<UserProductInteraction> interactions = interactionRepository.findByUserIdAndProductId(userId, productId);
            Optional<UserProductInteraction> reviewInterOpt = interactions.stream()
                    .filter(i -> "REVIEW".equals(i.getInteractionType()))
                    .findFirst();

            double score = (double) rating; // Điểm tương tác bằng số sao đánh giá (1.0 -> 5.0)

            if (reviewInterOpt.isPresent()) {
                UserProductInteraction inter = reviewInterOpt.get();
                inter.setInteractionScore(score);
                inter.setUpdatedAt(LocalDateTime.now());
                interactionRepository.save(inter);
            } else {
                UserProductInteraction inter = UserProductInteraction.builder()
                        .userId(userId)
                        .productId(productId)
                        .interactionScore(score)
                        .interactionType("REVIEW")
                        .build();
                interactionRepository.save(inter);
            }

            invalidateUserCaches(userId);

        } catch (Exception e) {
            log.error("Lỗi khi ghi nhận đánh giá sản phẩm: userId={}, productId={}", userId, productId, e);
        }
    }

    @Override
    @Transactional
    public void trackSearch(String userId, String keyword) {
        log.info("Ghi nhận từ khóa tìm kiếm: userId={}, keyword={}", userId, keyword);
        if (userId == null || keyword == null || keyword.trim().isEmpty()) return;

        try {
            // Cộng dồn từ khóa vào chiều searchKeywordScores của hồ sơ sở thích
            userPreferenceService.addSearchKeywords(userId, keyword);

            // Chỉ xóa cache gợi ý (KHÔNG rebuild/xóa hồ sơ) để lần gợi ý sau tính lại theo search mới
            invalidateUserRecommendationCache(userId);

        } catch (Exception e) {
            log.error("Lỗi khi ghi nhận từ khóa tìm kiếm: userId={}, keyword={}", userId, keyword, e);
        }
    }

    /**
     * Làm mới cache gợi ý của người dùng (xóa các khóa cache liên quan trên Database)
     * và xây lại hồ sơ sở thích theo tương tác mới nhất.
     * Dùng buildProfile (rebuild tại chỗ) thay vì xóa trắng để BẢO TOÀN chiều từ khóa tìm kiếm.
     */
    private void invalidateUserCaches(String userId) {
        try {
            invalidateUserRecommendationCache(userId);
            // Rebuild hồ sơ từ dữ liệu mới nhất, giữ nguyên searchKeywordScores đã tích lũy
            userPreferenceService.buildProfile(userId);
            log.info("Đã xóa cache DB + rebuild hồ sơ sở thích cho user {}", userId);
        } catch (Exception e) {
            log.error("Lỗi khi làm mới cache/hồ sơ của user {}", userId, e);
        }
    }

    /**
     * Xóa các khóa cache gợi ý của người dùng (collaborative / hybrid / foryou) mà KHÔNG đụng hồ sơ sở thích.
     */
    private void invalidateUserRecommendationCache(String userId) {
        String collabKey = "collaborative:" + userId;
        String hybridKey = "hybrid:" + userId;
        String forYouKey = "foryou:" + userId;

        cacheRepository.findByCacheKey(collabKey).ifPresent(cacheRepository::delete);
        cacheRepository.findByCacheKey(hybridKey).ifPresent(cacheRepository::delete);
        cacheRepository.findByCacheKey(forYouKey).ifPresent(cacheRepository::delete);
    }
}
