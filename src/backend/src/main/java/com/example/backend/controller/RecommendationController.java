package com.example.backend.controller;

import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.DTO.ViewTrackingRequest;
import com.example.backend.service.InteractionTrackingService;
import com.example.backend.service.RecommendationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller cung cấp các API liên quan đến hệ thống gợi ý sản phẩm cá nhân hóa.
 * Bao gồm gợi ý Content-Based, Collaborative Filtering, Hybrid và ghi nhận tương tác của người dùng.
 */
@RestController
@RequestMapping("/api/recommend")
@CrossOrigin("*")
public class RecommendationController {

    private final RecommendationService recommendationService;
    private final InteractionTrackingService trackingService;

    public RecommendationController(
            RecommendationService recommendationService,
            InteractionTrackingService trackingService
    ) {
        this.recommendationService = recommendationService;
        this.trackingService = trackingService;
    }

    /**
     * API lấy sản phẩm tương tự dựa trên đặc tính sản phẩm mục tiêu (Content-Based Filtering).
     * Phục vụ trang Chi tiết sản phẩm.
     *
     * @param productId Mã sản phẩm hiện tại
     * @param limit     Giới hạn số lượng kết quả trả về (mặc định là 8)
     */
    @GetMapping("/content/{productId}")
    public ResponseEntity<RecommendationResponse> getContentRecommendations(
            @PathVariable String productId,
            @RequestParam(defaultValue = "8") int limit
    ) {
        RecommendationResponse response = recommendationService.getContentBased(productId, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * API lấy gợi ý cá nhân hóa dựa trên hành vi lịch sử người dùng (Collaborative Filtering).
     *
     * @param userId Mã người dùng cần gợi ý
     * @param limit  Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/collaborative/{userId}")
    public ResponseEntity<RecommendationResponse> getCollaborativeRecommendations(
            @PathVariable String userId,
            @RequestParam(defaultValue = "8") int limit
    ) {
        RecommendationResponse response = recommendationService.getCollaborative(userId, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * API gợi ý hỗn hợp kết hợp đặc tính và hành vi mua sắm (Hybrid Recommendation).
     * Phục vụ trang chủ dành cho người dùng đã đăng nhập.
     *
     * @param userId Mã người dùng hiện tại
     * @param limit  Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/hybrid/{userId}")
    public ResponseEntity<RecommendationResponse> getHybridRecommendations(
            @PathVariable String userId,
            @RequestParam(defaultValue = "8") int limit
    ) {
        RecommendationResponse response = recommendationService.getHybrid(userId, limit);
        return ResponseEntity.ok(response);
    }

    /**
     * API lấy danh sách các sản phẩm phổ biến nhất (bán chạy nhất) hoặc mới nhất làm fallback.
     * Phục vụ trang chủ cho khách vãng lai hoặc giải quyết Cold Start.
     *
     * @param limit Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/popular")
    public ResponseEntity<RecommendationResponse> getPopularRecommendations(
            @RequestParam(defaultValue = "8") int limit
    ) {
        RecommendationResponse response = recommendationService.getPopular(limit);
        return ResponseEntity.ok(response);
    }

    /**
     * API gợi ý "Dành riêng cho bạn" (For You) dựa trên hồ sơ sở thích người dùng.
     * Phục vụ trang chủ cho người dùng đã đăng nhập.
     *
     * @param userId Mã người dùng hiện tại
     * @param limit  Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/foryou/{userId}")
    public ResponseEntity<RecommendationResponse> getForYouRecommendations(
            @PathVariable String userId,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(recommendationService.getForYou(userId, limit));
    }

    /**
     * API gợi ý sản phẩm đang thịnh hành (Trending) theo hành vi gần đây của toàn hệ thống.
     *
     * @param limit Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/trending")
    public ResponseEntity<RecommendationResponse> getTrendingRecommendations(
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(recommendationService.getTrending(limit));
    }

    /**
     * API gợi ý sản phẩm được đánh giá cao nhất (Top Rated) theo điểm Bayesian.
     *
     * @param limit Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/top-rated")
    public ResponseEntity<RecommendationResponse> getTopRatedRecommendations(
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(recommendationService.getTopRated(limit));
    }

    /**
     * API gợi ý "Khách hàng cũng mua" cho một sản phẩm cụ thể (co-occurrence trong đơn hàng).
     * Phục vụ trang Chi tiết sản phẩm.
     *
     * @param productId Mã sản phẩm đang xem
     * @param limit     Giới hạn số lượng kết quả (mặc định là 8)
     */
    @GetMapping("/also-bought/{productId}")
    public ResponseEntity<RecommendationResponse> getAlsoBoughtRecommendations(
            @PathVariable String productId,
            @RequestParam(defaultValue = "8") int limit
    ) {
        return ResponseEntity.ok(recommendationService.getAlsoBought(productId, limit));
    }

    /**
     * API ghi nhận lượt xem sản phẩm của người dùng để lưu vào lịch sử xem và tương tác.
     * Yêu cầu xác thực phía client và gửi payload chứa userId, productId.
     */
    @PostMapping("/track-view")
    public ResponseEntity<Void> trackProductView(@RequestBody ViewTrackingRequest request) {
        trackingService.trackView(request.getUserId(), request.getProductId());
        return ResponseEntity.ok().build();
    }
}
