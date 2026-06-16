package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.model.Product;
import com.example.backend.model.RecommendationCache;
import com.example.backend.repository.OrderDetailRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductViewHistoryRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.repository.UserProductInteractionRepository;
import com.example.backend.service.TrendingService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Triển khai Trending dựa trên dữ liệu hành vi trong cửa sổ thời gian gần đây (time-decay theo cửa sổ).
 *
 * Công thức (đã chuẩn hóa, dùng log để giảm thiên lệch giá trị lớn):
 *   raw(p)   = 0.15*log(1+views) + 0.25*log(1+carts) + 0.45*log(1+purchases) + 0.15*log(1+reviews)
 *   score(p) = raw(p) / maxRaw          (về khoảng 0..1)
 *
 * Trọng số ưu tiên hành vi gần với quyết định mua: purchases > carts > views ≈ reviews.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TrendingServiceImpl implements TrendingService {

    private final ProductViewHistoryRepository viewHistoryRepository;
    private final UserProductInteractionRepository interactionRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final RecommendationCacheWriter cacheWriter;
    private final ObjectMapper objectMapper;

    // Cửa sổ thời gian tính trending (ngày)
    private static final int WINDOW_DAYS = 14;

    // Trọng số từng loại hành vi
    private static final double W_VIEW = 0.15;
    private static final double W_CART = 0.25;
    private static final double W_PURCHASE = 0.45;
    private static final double W_REVIEW = 0.15;

    private static final String CACHE_KEY = "trending";

    @Override
    @Transactional
    public RecommendationResponse getTrending(int limit) {
        log.info("Yêu cầu gợi ý Trending, giới hạn: {}", limit);

        // 1. Thử lấy từ cache DB
        try {
            Optional<RecommendationCache> cached = cacheRepository.findByCacheKeyAndExpiresAtAfter(CACHE_KEY, LocalDateTime.now());
            if (cached.isPresent()) {
                List<RecommendationDTO> recs = objectMapper.readValue(
                        cached.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {});
                return RecommendationResponse.success(
                        recs.stream().limit(limit).collect(Collectors.toList()),
                        "TRENDING", "Sản phẩm đang thịnh hành (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache Trending", e);
        }

        try {
            Map<String, Double> scores = computeScores();
            if (scores.isEmpty()) {
                return RecommendationResponse.empty("Chưa đủ dữ liệu để xác định xu hướng");
            }

            // Sắp xếp theo điểm giảm dần, lấy dư 20 để cache
            List<String> rankedIds = scores.entrySet().stream()
                    .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                    .limit(20)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            Map<String, Product> productMap = productRepository.findAllById(rankedIds).stream()
                    .collect(Collectors.toMap(Product::getProductId, p -> p));

            List<RecommendationDTO> trending = new ArrayList<>();
            for (String pId : rankedIds) {
                Product p = productMap.get(pId);
                if (p == null) continue;
                RecommendationDTO dto = new RecommendationDTO(p);
                dto.setSimilarityScore(scores.get(pId));
                dto.setRecommendationType("TRENDING");
                trending.add(dto);
            }

            // Lưu cache (TTL 30 phút) - UPSERT atomic, thread-safe
            String json = objectMapper.writeValueAsString(trending);
            cacheWriter.put(CACHE_KEY, json, LocalDateTime.now().plusMinutes(30));

            return RecommendationResponse.success(
                    trending.stream().limit(limit).collect(Collectors.toList()),
                    "TRENDING", "Sản phẩm đang thịnh hành");

        } catch (Exception e) {
            log.error("Lỗi khi tính toán Trending", e);
            return RecommendationResponse.empty("Không thể lấy danh sách sản phẩm thịnh hành");
        }
    }

    @Override
    public Map<String, Double> getTrendingScores() {
        try {
            return computeScores();
        } catch (Exception e) {
            log.error("Lỗi khi tính điểm Trending cho Hybrid", e);
            return Collections.emptyMap();
        }
    }

    /**
     * Tính điểm trending đã chuẩn hóa 0..1 cho mọi sản phẩm có hoạt động trong cửa sổ thời gian.
     */
    private Map<String, Double> computeScores() {
        LocalDateTime since = LocalDateTime.now().minusDays(WINDOW_DAYS);

        Map<String, double[]> stats = new HashMap<>(); // productId -> [views, carts, purchases, reviews]

        // Lượt xem
        for (Object[] row : viewHistoryRepository.sumViewCountSince(since)) {
            accumulate(stats, (String) row[0], 0, toDouble(row[1]));
        }
        // Lượt thêm giỏ
        for (Object[] row : interactionRepository.countByTypeSince("ADD_TO_CART", since)) {
            accumulate(stats, (String) row[0], 1, toDouble(row[1]));
        }
        // Lượt mua
        for (Object[] row : orderDetailRepository.sumPurchasesSince(since)) {
            accumulate(stats, (String) row[0], 2, toDouble(row[1]));
        }
        // Lượt đánh giá
        for (Object[] row : reviewRepository.countReviewsSince(since)) {
            accumulate(stats, (String) row[0], 3, toDouble(row[1]));
        }

        // Tính raw score
        Map<String, Double> raw = new HashMap<>();
        double maxRaw = 0.0;
        for (Map.Entry<String, double[]> e : stats.entrySet()) {
            double[] s = e.getValue();
            double value = W_VIEW * Math.log(1 + s[0])
                    + W_CART * Math.log(1 + s[1])
                    + W_PURCHASE * Math.log(1 + s[2])
                    + W_REVIEW * Math.log(1 + s[3]);
            raw.put(e.getKey(), value);
            if (value > maxRaw) maxRaw = value;
        }

        if (maxRaw <= 0.0) {
            return Collections.emptyMap();
        }

        // Chuẩn hóa về 0..1
        Map<String, Double> normalized = new HashMap<>();
        for (Map.Entry<String, Double> e : raw.entrySet()) {
            normalized.put(e.getKey(), e.getValue() / maxRaw);
        }
        return normalized;
    }

    private void accumulate(Map<String, double[]> stats, String productId, int index, double value) {
        if (productId == null) return;
        stats.computeIfAbsent(productId, k -> new double[4])[index] += value;
    }

    private double toDouble(Object o) {
        return (o instanceof Number) ? ((Number) o).doubleValue() : 0.0;
    }
}
