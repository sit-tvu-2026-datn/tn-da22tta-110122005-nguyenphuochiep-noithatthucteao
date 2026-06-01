package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.model.Product;
import com.example.backend.model.RecommendationCache;
import com.example.backend.model.UserProductInteraction;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.repository.UserProductInteractionRepository;
import com.example.backend.service.CollaborativeFilteringService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Triển khai thuật toán gợi ý lọc cộng tác dựa trên sản phẩm (Item-Based Collaborative Filtering).
 * Dự đoán mức độ yêu thích của người dùng đối với một sản phẩm dựa trên độ tương đồng giữa các sản phẩm
 * mà người dùng đó đã từng tương tác trong quá khứ.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CollaborativeFilteringServiceImpl implements CollaborativeFilteringService {

    private final UserProductInteractionRepository interactionRepository;
    private final ProductRepository productRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final ObjectMapper objectMapper;

    // Bộ nhớ đệm ma trận tương đồng giữa các sản phẩm (Item-Item Similarity Matrix)
    // Map<productId_A, Map<productId_B, SimilarityScore>>
    private final Map<String, Map<String, Double>> itemSimilarityMatrix = new ConcurrentHashMap<>();
    
    // Ma trận tương tác User-Item: Map<userId, Map<productId, score>>
    private final Map<String, Map<String, Double>> userItemMatrix = new ConcurrentHashMap<>();
    
    private boolean isMatrixBuilt = false;

    @Override
    @Transactional
    public RecommendationResponse getCollaborativeRecommendations(String userId, int limit) {
        log.info("Yêu cầu gợi ý Collaborative Filtering cho người dùng: {}, giới hạn: {}", userId, limit);

        // 1. Kiểm tra lịch sử tương tác của người dùng
        long interactionCount = interactionRepository.countByUserId(userId);
        if (interactionCount < 1) {
            log.info("Người dùng mới hoặc không có tương tác: {}. Trả về danh sách trống để fallback.", userId);
            return RecommendationResponse.empty("Người dùng chưa có lịch sử tương tác");
        }

        String cacheKey = "collaborative:" + userId;

        // 2. Thử lấy từ Database Cache trước
        try {
            Optional<RecommendationCache> cachedData = cacheRepository.findByCacheKeyAndExpiresAtAfter(cacheKey, LocalDateTime.now());
            if (cachedData.isPresent()) {
                log.info("Lấy kết quả gợi ý Collaborative từ cache DB cho người dùng: {}", userId);
                List<RecommendationDTO> recommendations = objectMapper.readValue(
                        cachedData.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {}
                );
                List<RecommendationDTO> limitedRecs = recommendations.stream().limit(limit).collect(Collectors.toList());
                return RecommendationResponse.success(limitedRecs, "COLLABORATIVE", "Gợi ý cá nhân hóa dựa trên sở thích của bạn (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache DB gợi ý Collaborative cho người dùng: {}", userId, e);
        }

        // 3. Nếu Cache miss, tiến hành tính toán
        try {
            ensureMatricesBuilt();

            Map<String, Double> targetUserInteractions = userItemMatrix.get(userId);
            if (targetUserInteractions == null || targetUserInteractions.isEmpty()) {
                log.info("Không tìm thấy dữ liệu tương tác của người dùng {} trên ma trận bộ nhớ", userId);
                return RecommendationResponse.empty("Chưa đủ dữ liệu hành vi");
            }

            // Lấy danh sách tất cả sản phẩm hiện có để dự đoán điểm
            List<Product> allProducts = productRepository.findAll();
            List<RecommendationDTO> predictions = new ArrayList<>();

            for (Product product : allProducts) {
                String pId = product.getProductId();
                
                // Chỉ gợi ý các sản phẩm mà người dùng CHƯA tương tác mua hoặc review (có thể giữ lại sản phẩm đã VIEW nếu điểm thấp)
                // Tuy nhiên, thông thường ta sẽ lọc bỏ các sản phẩm đã có tương tác mạnh (như ADD_TO_CART, PURCHASE, REVIEW)
                if (targetUserInteractions.containsKey(pId) && targetUserInteractions.get(pId) >= 3.0) {
                    continue; 
                }

                // Tính điểm dự đoán (Predicted Score) cho sản phẩm này đối với người dùng
                // predicted_score = Σ (similarity(pId, interacted_pId) * score(interacted_pId)) / Σ |similarity(pId, interacted_pId)|
                double weightedSum = 0.0;
                double similaritySum = 0.0;

                Map<String, Double> similaritiesForProduct = itemSimilarityMatrix.get(pId);
                
                if (similaritiesForProduct != null) {
                    for (Map.Entry<String, Double> userInteracted : targetUserInteractions.entrySet()) {
                        String interactedProductId = userInteracted.getKey();
                        double interactionScore = userInteracted.getValue();

                        double similarity = similaritiesForProduct.getOrDefault(interactedProductId, 0.0);
                        if (similarity > 0.0) {
                            weightedSum += similarity * interactionScore;
                            similaritySum += similarity;
                        }
                    }
                }

                if (similaritySum > 0.0) {
                    double predictedScore = weightedSum / similaritySum;
                    
                    // Tạo DTO gợi ý
                    RecommendationDTO dto = new RecommendationDTO(product);
                    // Chuẩn hóa điểm dự đoán thành similarityScore (lọc cộng tác thường đưa về 0-1)
                    // Điểm tương đồng được tính theo thang đo quy đổi từ predictedScore (tối đa là 5.0)
                    dto.setSimilarityScore(Math.min(1.0, predictedScore / 5.0));
                    dto.setRecommendationType("COLLABORATIVE");
                    predictions.add(dto);
                }
            }

            // Sắp xếp giảm dần theo điểm dự đoán
            predictions.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));

            // Lưu toàn bộ gợi ý vào Cache DB (tối đa 20 sản phẩm)
            List<RecommendationDTO> cacheList = predictions.stream().limit(20).collect(Collectors.toList());
            String jsonCache = objectMapper.writeValueAsString(cacheList);

            cacheRepository.findByCacheKey(cacheKey).ifPresent(cacheRepository::delete);

            // Lưu cache mới hết hạn sau 30 phút (Collaborative Filtering cập nhật nhanh hơn)
            RecommendationCache newCache = RecommendationCache.builder()
                    .cacheKey(cacheKey)
                    .recommendationData(jsonCache)
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build();
            cacheRepository.save(newCache);

            List<RecommendationDTO> resultList = predictions.stream().limit(limit).collect(Collectors.toList());
            return RecommendationResponse.success(resultList, "COLLABORATIVE", "Gợi ý cá nhân hóa dựa trên lịch sử mua sắm");

        } catch (Exception e) {
            log.error("Lỗi khi tính toán gợi ý lọc cộng tác cho người dùng: {}", userId, e);
            return RecommendationResponse.empty("Lỗi hệ thống khi tính toán gợi ý");
        }
    }

    @Override
    public synchronized void invalidateCache() {
        log.info("Xóa bộ nhớ đệm Collaborative Filtering trên RAM");
        itemSimilarityMatrix.clear();
        userItemMatrix.clear();
        isMatrixBuilt = false;
    }

    /**
     * Đảm bảo các ma trận tương tác và tương đồng sản phẩm đã được dựng trên bộ nhớ.
     */
    private synchronized void ensureMatricesBuilt() {
        if (isMatrixBuilt) {
            return;
        }
        buildMatrices();
    }

    /**
     * Xây dựng ma trận tương tác User-Item và tính toán ma trận tương đồng Item-Item.
     */
    private void buildMatrices() {
        log.info("Bắt đầu xây dựng ma trận tương tác và ma trận tương đồng sản phẩm...");
        
        // 1. Tải tất cả dữ liệu tương tác từ Database
        List<UserProductInteraction> interactions = interactionRepository.findAll();
        
        // Nhóm các tương tác theo người dùng và sản phẩm: Map<userId, Map<productId, SumScore>>
        userItemMatrix.clear();
        for (UserProductInteraction inter : interactions) {
            String uId = inter.getUserId();
            String pId = inter.getProductId();
            double score = inter.getInteractionScore();

            userItemMatrix.putIfAbsent(uId, new ConcurrentHashMap<>());
            Map<String, Double> userRatings = userItemMatrix.get(uId);
            
            // Nếu có nhiều loại tương tác cho cùng một cặp User-Product, cộng dồn điểm (ví dụ: VIEW=1.0 + PURCHASE=5.0 = 6.0)
            // Giới hạn điểm tối đa là 10.0 để giữ tính nhất quán
            double newScore = userRatings.getOrDefault(pId, 0.0) + score;
            userRatings.put(pId, Math.min(10.0, newScore));
        }

        // 2. Tính ma trận tương đồng Item-Item
        // Lấy danh sách tất cả ID sản phẩm đã có tương tác
        List<String> productIds = interactionRepository.findDistinctProductIds();
        itemSimilarityMatrix.clear();

        // Khởi tạo các map con
        for (String pId : productIds) {
            itemSimilarityMatrix.put(pId, new ConcurrentHashMap<>());
        }

        // Tính Cosine Similarity cho từng cặp sản phẩm có tương tác
        for (int i = 0; i < productIds.size(); i++) {
            String pIdA = productIds.get(i);
            
            for (int j = i; j < productIds.size(); j++) {
                String pIdB = productIds.get(j);

                if (pIdA.equals(pIdB)) {
                    itemSimilarityMatrix.get(pIdA).put(pIdB, 1.0);
                    continue;
                }

                // Tính Cosine Similarity giữa A và B dựa trên các đánh giá của người dùng
                double similarity = calculateItemCosineSimilarity(pIdA, pIdB);
                
                if (similarity > 0.0) {
                    itemSimilarityMatrix.get(pIdA).put(pIdB, similarity);
                    itemSimilarityMatrix.get(pIdB).put(pIdA, similarity);
                }
            }
        }

        isMatrixBuilt = true;
        log.info("Xây dựng ma trận Collaborative Filtering thành công cho {} người dùng và {} sản phẩm tương tác.", 
                userItemMatrix.size(), productIds.size());
    }

    /**
     * Tính Cosine Similarity giữa hai sản phẩm A và B dựa trên vector phản hồi của người dùng.
     */
    private double calculateItemCosineSimilarity(String productIdA, String productIdB) {
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        
        boolean sharedUser = false;

        // Quét qua các user xem họ có tương tác với cả 2 sản phẩm A và B không
        for (Map<String, Double> userRatings : userItemMatrix.values()) {
            Double ratingA = userRatings.get(productIdA);
            Double ratingB = userRatings.get(productIdB);

            if (ratingA != null) {
                normA += ratingA * ratingA;
            }
            if (ratingB != null) {
                normB += ratingB * ratingB;
            }

            if (ratingA != null && ratingB != null) {
                dotProduct += ratingA * ratingB;
                sharedUser = true;
            }
        }

        // Nếu không có người dùng nào tương tác chung với cả 2 sản phẩm
        if (!sharedUser || normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
