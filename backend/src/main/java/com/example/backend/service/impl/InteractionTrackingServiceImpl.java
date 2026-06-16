package com.example.backend.service.impl;

import com.example.backend.model.ProductViewHistory;
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
            Optional<ProductViewHistory> existingView = viewHistoryRepository.findByUserIdAndProductId(userId, productId);
            if (existingView.isPresent()) {
                ProductViewHistory viewHistory = existingView.get();
                viewHistory.setViewCount(viewHistory.getViewCount() + 1);
                viewHistoryRepository.save(viewHistory);
            } else {
                ProductViewHistory viewHistory = ProductViewHistory.builder()
                        .userId(userId)
                        .productId(productId)
                        .viewCount(1)
                        .build();
                viewHistoryRepository.save(viewHistory);
            }

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

    /**
     * Làm mới cache gợi ý của người dùng (xóa các khóa cache liên quan trên Database)
     * và xóa hồ sơ sở thích để buộc tính lại theo tương tác mới nhất.
     */
    private void invalidateUserCaches(String userId) {
        String collabKey = "collaborative:" + userId;
        String hybridKey = "hybrid:" + userId;
        String forYouKey = "foryou:" + userId;

        try {
            cacheRepository.findByCacheKey(collabKey).ifPresent(cacheRepository::delete);
            cacheRepository.findByCacheKey(hybridKey).ifPresent(cacheRepository::delete);
            cacheRepository.findByCacheKey(forYouKey).ifPresent(cacheRepository::delete);
            // Xóa hồ sơ sở thích để lần gợi ý kế tiếp xây lại từ dữ liệu mới
            userPreferenceService.invalidateProfile(userId);
            log.info("Đã xóa cache DB + hồ sơ sở thích cũ cho user {}", userId);
        } catch (Exception e) {
            log.error("Lỗi khi xóa cache DB của user {}", userId, e);
        }
    }
}
