package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.model.Product;
import com.example.backend.model.RecommendationCache;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.repository.ReviewRepository;
import com.example.backend.service.RatingService;
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
 * Triển khai Top Rated bằng Bayesian Weighted Rating (IMDB).
 * score = (v/(v+m))*R + (m/(v+m))*C
 *   R = điểm trung bình của sản phẩm, v = số review của sản phẩm
 *   C = điểm trung bình toàn hệ thống, m = ngưỡng review tối thiểu để được tin cậy
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RatingServiceImpl implements RatingService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final RecommendationCacheWriter cacheWriter;
    private final ObjectMapper objectMapper;

    // Ngưỡng số review tối thiểu để điểm trung bình của sản phẩm được tin cậy hoàn toàn
    private static final double MINIMUM_REVIEWS = 5.0;
    private static final String CACHE_KEY = "toprated";

    @Override
    @Transactional
    public RecommendationResponse getTopRated(int limit) {
        log.info("Yêu cầu gợi ý Top Rated, giới hạn: {}", limit);

        // 1. Thử lấy từ cache DB
        try {
            Optional<RecommendationCache> cached = cacheRepository.findByCacheKeyAndExpiresAtAfter(CACHE_KEY, LocalDateTime.now());
            if (cached.isPresent()) {
                List<RecommendationDTO> recs = objectMapper.readValue(
                        cached.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {});
                return RecommendationResponse.success(
                        recs.stream().limit(limit).collect(Collectors.toList()),
                        "TOP_RATED", "Sản phẩm được đánh giá cao nhất (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache Top Rated", e);
        }

        try {
            // 2. Tổng hợp điểm đánh giá theo sản phẩm: [productId, avgRating, count]
            List<Object[]> aggregates = reviewRepository.aggregateRatings();
            if (aggregates.isEmpty()) {
                return RecommendationResponse.empty("Chưa có dữ liệu đánh giá");
            }

            // C: điểm trung bình toàn hệ thống
            Double globalAvg = reviewRepository.globalAverageRating();
            double C = (globalAvg != null) ? globalAvg : 0.0;

            // 3. Tính điểm Bayesian cho từng sản phẩm
            class Scored {
                String productId;
                double bayesScore;
                double avgRating;
                int reviewCount;
            }
            List<Scored> scoredList = new ArrayList<>();

            for (Object[] row : aggregates) {
                String productId = (String) row[0];
                double R = ((Number) row[1]).doubleValue(); // avg rating
                int v = ((Number) row[2]).intValue();        // review count

                double bayes = (v / (v + MINIMUM_REVIEWS)) * R + (MINIMUM_REVIEWS / (v + MINIMUM_REVIEWS)) * C;

                Scored s = new Scored();
                s.productId = productId;
                s.bayesScore = bayes;
                s.avgRating = R;
                s.reviewCount = v;
                scoredList.add(s);
            }

            // Sắp xếp theo điểm Bayesian giảm dần
            scoredList.sort((a, b) -> Double.compare(b.bayesScore, a.bayesScore));

            // 4. Nạp thông tin Product và dựng DTO (lấy dư 20 để cache)
            List<Scored> topScored = scoredList.stream().limit(20).collect(Collectors.toList());
            List<String> ids = topScored.stream().map(s -> s.productId).collect(Collectors.toList());
            Map<String, Product> productMap = productRepository.findAllById(ids).stream()
                    .collect(Collectors.toMap(Product::getProductId, p -> p));

            List<RecommendationDTO> topRated = new ArrayList<>();
            for (Scored s : topScored) {
                Product p = productMap.get(s.productId);
                if (p == null) continue;
                RecommendationDTO dto = new RecommendationDTO(p);
                dto.setSimilarityScore(Math.min(1.0, s.bayesScore / 5.0)); // chuẩn hóa 0..1
                dto.setAverageRating(Math.round(s.avgRating * 10.0) / 10.0);
                dto.setReviewCount(s.reviewCount);
                dto.setRecommendationType("TOP_RATED");
                topRated.add(dto);
            }

            // 5. Lưu cache (TTL 1 giờ) - UPSERT atomic, thread-safe
            String json = objectMapper.writeValueAsString(topRated);
            cacheWriter.put(CACHE_KEY, json, LocalDateTime.now().plusHours(1));

            return RecommendationResponse.success(
                    topRated.stream().limit(limit).collect(Collectors.toList()),
                    "TOP_RATED", "Sản phẩm được đánh giá cao nhất");

        } catch (Exception e) {
            log.error("Lỗi khi tính toán Top Rated", e);
            return RecommendationResponse.empty("Không thể lấy danh sách sản phẩm đánh giá cao");
        }
    }
}
