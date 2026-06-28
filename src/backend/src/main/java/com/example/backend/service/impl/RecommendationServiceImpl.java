package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.model.Product;
import com.example.backend.model.ProductViewHistory;
import com.example.backend.model.RecommendationCache;
import com.example.backend.repository.OrderDetailRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.ProductViewHistoryRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.repository.UserProductInteractionRepository;
import com.example.backend.service.CollaborativeFilteringService;
import com.example.backend.service.ContentBasedService;
import com.example.backend.service.DiversityService;
import com.example.backend.service.RatingService;
import com.example.backend.service.RecommendationService;
import com.example.backend.service.TrendingService;
import com.example.backend.service.UserPreferenceService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Triển khai lớp RecommendationService để kết hợp và phân phối các kết quả gợi ý.
 * Áp dụng mô hình kết hợp (Hybrid) và giải quyết bài toán "khởi đầu lạnh" (Cold Start).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationServiceImpl implements RecommendationService {

    private final ContentBasedService contentBasedService;
    private final CollaborativeFilteringService collaborativeFilteringService;
    private final UserPreferenceService userPreferenceService;
    private final TrendingService trendingService;
    private final RatingService ratingService;
    private final DiversityService diversityService;

    private final ProductRepository productRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ProductViewHistoryRepository viewHistoryRepository;
    private final UserProductInteractionRepository interactionRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final RecommendationCacheWriter cacheWriter;
    private final ObjectMapper objectMapper;

    @Override
    public RecommendationResponse getContentBased(String productId, int limit) {
        return contentBasedService.getContentBasedRecommendations(productId, limit);
    }

    @Override
    public RecommendationResponse getCollaborative(String userId, int limit) {
        return collaborativeFilteringService.getCollaborativeRecommendations(userId, limit);
    }

    @Override
    public RecommendationResponse getHybrid(String userId, int limit) {
        log.info("Yêu cầu gợi ý Hybrid cho người dùng: {}, giới hạn: {}", userId, limit);
        
        String cacheKey = "hybrid:" + userId;

        // 1. Thử lấy kết quả từ Cache DB trước
        try {
            Optional<RecommendationCache> cachedData = cacheRepository.findByCacheKeyAndExpiresAtAfter(cacheKey, LocalDateTime.now());
            if (cachedData.isPresent()) {
                log.info("Lấy gợi ý Hybrid từ cache DB cho người dùng: {}", userId);
                List<RecommendationDTO> recommendations = objectMapper.readValue(
                        cachedData.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {}
                );
                List<RecommendationDTO> limitedRecs = recommendations.stream().limit(limit).collect(Collectors.toList());
                return RecommendationResponse.success(limitedRecs, "HYBRID", "Gợi ý cá nhân hóa dành riêng cho bạn (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache DB gợi ý Hybrid cho người dùng: {}", userId, e);
        }

        // 2. Kiểm tra số lượng tương tác của người dùng để xác định Cold Start
        long interactionCount = interactionRepository.countByUserId(userId);
        log.info("Người dùng {} có {} tương tác lịch sử", userId, interactionCount);

        // Trường hợp Cold Start tuyệt đối: người dùng chưa có bất kỳ tương tác nào
        if (interactionCount == 0) {
            List<ProductViewHistory> viewHistory = viewHistoryRepository.findByUserIdOrderByLastViewedAtDesc(userId);
            if (!viewHistory.isEmpty()) {
                String latestViewedProductId = viewHistory.get(0).getProductId();
                log.info("User {} chưa có tương tác, gợi ý theo sản phẩm vừa xem: {}", userId, latestViewedProductId);
                RecommendationResponse cbResponse = contentBasedService.getContentBasedRecommendations(latestViewedProductId, limit);
                cbResponse.setRecommendationType("HYBRID");
                cbResponse.setMessage("Gợi ý dựa trên sản phẩm bạn vừa xem");
                return cbResponse;
            }
            log.info("User {} không có lịch sử. Fallback sản phẩm phổ biến.", userId);
            return getPopular(limit);
        }

        // Trường hợp có tương tác -> Dynamic Hybrid (CF + CB + Trending) + boost sở thích + đa dạng hóa
        try {
            // Trọng số động theo mức độ tương tác: [wCF, wCB, wTrend]
            double[] w = resolveDynamicWeights(interactionCount);
            log.info("Trọng số Hybrid động cho user {} ({} tương tác): CF={}, CB={}, Trend={}",
                    userId, interactionCount, w[0], w[1], w[2]);

            // Điểm Collaborative Filtering theo sản phẩm
            Map<String, Double> cfScore = new HashMap<>();
            Map<String, RecommendationDTO> dtoMap = new HashMap<>();
            for (RecommendationDTO item : collaborativeFilteringService.getCollaborativeRecommendations(userId, limit * 3).getRecommendations()) {
                cfScore.put(item.getProductId(), item.getSimilarityScore());
                dtoMap.putIfAbsent(item.getProductId(), item);
            }

            // Điểm Content-Based từ sản phẩm xem gần nhất
            Map<String, Double> cbScore = new HashMap<>();
            List<ProductViewHistory> viewHistory = viewHistoryRepository.findByUserIdOrderByLastViewedAtDesc(userId);
            if (!viewHistory.isEmpty()) {
                String latestProductId = viewHistory.get(0).getProductId();
                for (RecommendationDTO item : contentBasedService.getContentBasedRecommendations(latestProductId, limit * 3).getRecommendations()) {
                    cbScore.put(item.getProductId(), item.getSimilarityScore());
                    dtoMap.putIfAbsent(item.getProductId(), item);
                }
            }

            // Điểm Trending toàn cục + đưa thêm các sản phẩm trending nổi bật vào tập ứng viên
            Map<String, Double> trendScore = trendingService.getTrendingScores();
            List<String> topTrendingIds = trendScore.entrySet().stream()
                    .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                    .limit(limit * 2L)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
            List<String> missingTrending = topTrendingIds.stream()
                    .filter(id -> !dtoMap.containsKey(id))
                    .collect(Collectors.toList());
            if (!missingTrending.isEmpty()) {
                for (Product p : productRepository.findAllById(missingTrending)) {
                    dtoMap.putIfAbsent(p.getProductId(), new RecommendationDTO(p));
                }
            }

            // Hệ số boost cá nhân hóa theo hồ sơ sở thích
            Map<String, Double> prefScore = userPreferenceService.getProductPreferenceScores(userId);

            // Loại sản phẩm người dùng đã tương tác mạnh (đã mua / thêm giỏ / đánh giá)
            Set<String> strongInteracted = interactionRepository.findByUserId(userId).stream()
                    .filter(i -> i.getInteractionScore() >= 3.0)
                    .map(i -> i.getProductId())
                    .collect(Collectors.toSet());

            // Tính điểm tổng hợp cuối cùng cho từng ứng viên
            List<RecommendationDTO> hybridList = new ArrayList<>();
            for (Map.Entry<String, RecommendationDTO> entry : dtoMap.entrySet()) {
                String pId = entry.getKey();
                if (strongInteracted.contains(pId)) continue;

                double base = w[0] * cfScore.getOrDefault(pId, 0.0)
                        + w[1] * cbScore.getOrDefault(pId, 0.0)
                        + w[2] * trendScore.getOrDefault(pId, 0.0);
                if (base <= 0.0) continue;

                double pref = prefScore.getOrDefault(pId, 0.0);
                double finalScore = base * (1.0 + 0.25 * pref); // boost tối đa +25% theo sở thích

                RecommendationDTO dto = entry.getValue();
                dto.setSimilarityScore(finalScore);
                dto.setRecommendationType("HYBRID");
                hybridList.add(dto);
            }

            if (hybridList.isEmpty()) {
                log.warn("Không tính được Hybrid cho user {}. Fallback sản phẩm phổ biến.", userId);
                return getPopular(limit);
            }

            // Sắp xếp giảm dần rồi đa dạng hóa kết quả
            hybridList.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));
            List<RecommendationDTO> diversified = diversityService.rerank(
                    hybridList.stream().limit(20).collect(Collectors.toList()), 3);

            // Lưu cache hết hạn sau 30 phút (UPSERT atomic, thread-safe)
            String jsonCache = objectMapper.writeValueAsString(diversified);
            cacheWriter.put(cacheKey, jsonCache, LocalDateTime.now().plusMinutes(30));

            List<RecommendationDTO> resultList = diversified.stream().limit(limit).collect(Collectors.toList());
            return RecommendationResponse.success(resultList, "HYBRID", "Gợi ý cá nhân hóa kết hợp sở thích và hành vi của bạn");

        } catch (Exception e) {
            log.error("Lỗi khi kết hợp gợi ý Hybrid cho người dùng: {}", userId, e);
            return getPopular(limit); // Gặp lỗi thì fallback sang sản phẩm bán chạy để đảm bảo UI hoạt động
        }
    }

    /**
     * Trả về bộ trọng số động [wCF, wCB, wTrend] dựa trên mức độ tương tác của người dùng.
     * Người dùng càng nhiều dữ liệu hành vi thì càng tin tưởng Collaborative Filtering.
     */
    private double[] resolveDynamicWeights(long interactionCount) {
        if (interactionCount < 5) {
            return new double[]{0.20, 0.60, 0.20}; // ít dữ liệu: ưu tiên nội dung + xu hướng
        } else if (interactionCount <= 20) {
            return new double[]{0.50, 0.30, 0.20}; // dữ liệu vừa: cân bằng
        } else {
            return new double[]{0.70, 0.20, 0.10}; // nhiều dữ liệu: ưu tiên hành vi cộng tác
        }
    }

    @Override
    public RecommendationResponse getPopular(int limit) {
        log.info("Yêu cầu gợi ý sản phẩm phổ biến, giới hạn: {}", limit);
        String cacheKey = "popular";

        // Thử lấy từ Cache DB
        try {
            Optional<RecommendationCache> cachedData = cacheRepository.findByCacheKeyAndExpiresAtAfter(cacheKey, LocalDateTime.now());
            if (cachedData.isPresent()) {
                log.info("Lấy danh sách sản phẩm phổ biến từ cache DB");
                List<RecommendationDTO> recommendations = objectMapper.readValue(
                        cachedData.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {}
                );
                List<RecommendationDTO> limitedRecs = recommendations.stream().limit(limit).collect(Collectors.toList());
                return RecommendationResponse.success(limitedRecs, "POPULAR", "Xu hướng mua sắm nổi bật (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache DB của gợi ý phổ biến", e);
        }

        try {
            List<RecommendationDTO> popularList = new ArrayList<>();
            
            // Lấy ID các sản phẩm bán chạy nhất
            List<String> topSellingIds = orderDetailRepository.findTopSellingProductIds(PageRequest.of(0, limit * 2));
            log.info("Tìm thấy {} sản phẩm bán chạy nhất từ OrderDetails", topSellingIds.size());

            if (!topSellingIds.isEmpty()) {
                List<Product> products = productRepository.findAllById(topSellingIds);
                // Vì findAllById không đảm bảo thứ tự bán chạy, cần sắp xếp lại theo danh sách topSellingIds
                Map<String, Product> productMap = products.stream()
                        .collect(Collectors.toMap(Product::getProductId, p -> p));
                
                double score = 1.0;
                for (String pId : topSellingIds) {
                    Product p = productMap.get(pId);
                    if (p != null) {
                        RecommendationDTO dto = new RecommendationDTO(p);
                        dto.setSimilarityScore(score); // Gán điểm tương đối giảm dần làm độ hot
                        dto.setRecommendationType("POPULAR");
                        popularList.add(dto);
                        score -= (1.0 / (topSellingIds.size() + 1));
                    }
                }
            }

            // Fallback: Nếu không có sản phẩm bán chạy nào (VD: dự án mới tinh chưa có đơn hàng nào),
            // lấy các sản phẩm mới nhất
            if (popularList.isEmpty()) {
                log.info("Chưa có dữ liệu bán hàng. Gợi ý fallback bằng các sản phẩm mới nhất.");
                List<Product> newestProducts = productRepository.findAll(
                        PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"))
                ).getContent();

                double score = 1.0;
                for (Product p : newestProducts) {
                    RecommendationDTO dto = new RecommendationDTO(p);
                    dto.setSimilarityScore(score);
                    dto.setRecommendationType("POPULAR");
                    popularList.add(dto);
                    score -= 0.05;
                }
            }

            // Lưu cache DB hết hạn sau 1 giờ (UPSERT atomic, thread-safe)
            String jsonCache = objectMapper.writeValueAsString(popularList);
            cacheWriter.put(cacheKey, jsonCache, LocalDateTime.now().plusHours(1));

            List<RecommendationDTO> resultList = popularList.stream().limit(limit).collect(Collectors.toList());
            return RecommendationResponse.success(resultList, "POPULAR", "Xu hướng mua sắm nổi bật");

        } catch (Exception e) {
            log.error("Lỗi khi tính toán gợi ý sản phẩm phổ biến", e);
            return RecommendationResponse.empty("Không thể lấy danh sách gợi ý phổ biến");
        }
    }

    @Override
    public RecommendationResponse getForYou(String userId, int limit) {
        RecommendationResponse response = userPreferenceService.getForYouRecommendations(userId, limit);
        // Nếu chưa đủ dữ liệu sở thích -> fallback sang Trending rồi Popular để UI không trống
        if (response.getRecommendations() == null || response.getRecommendations().isEmpty()) {
            RecommendationResponse trending = getTrending(limit);
            if (trending.getRecommendations() != null && !trending.getRecommendations().isEmpty()) {
                return trending;
            }
            return getPopular(limit);
        }
        return response;
    }

    @Override
    public RecommendationResponse getTrending(int limit) {
        RecommendationResponse response = trendingService.getTrending(limit);
        if (response.getRecommendations() == null || response.getRecommendations().isEmpty()) {
            return getPopular(limit); // fallback khi chưa đủ dữ liệu hành vi gần đây
        }
        return response;
    }

    @Override
    public RecommendationResponse getTopRated(int limit) {
        RecommendationResponse response = ratingService.getTopRated(limit);
        if (response.getRecommendations() == null || response.getRecommendations().isEmpty()) {
            return getPopular(limit); // fallback khi chưa có đánh giá
        }
        return response;
    }

    @Override
    public RecommendationResponse getAlsoBought(String productId, int limit) {
        return collaborativeFilteringService.getAlsoBought(productId, limit);
    }
}
