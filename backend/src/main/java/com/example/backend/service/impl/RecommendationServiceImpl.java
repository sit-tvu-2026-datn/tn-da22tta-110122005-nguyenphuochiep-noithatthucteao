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
import com.example.backend.service.RecommendationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    
    private final ProductRepository productRepository;
    private final OrderDetailRepository orderDetailRepository;
    private final ProductViewHistoryRepository viewHistoryRepository;
    private final UserProductInteractionRepository interactionRepository;
    private final RecommendationCacheRepository cacheRepository;
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
    @Transactional
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

        // Trường hợp 1: Người dùng mới hoặc rất ít tương tác (< 3 tương tác) -> Giải quyết Cold Start
        if (interactionCount < 3) {
            log.info("Người dùng {} chưa đủ tương tác ({} < 3). Sử dụng giải pháp gợi ý dựa trên sản phẩm xem gần nhất.", userId, interactionCount);
            
            // Lấy sản phẩm vừa xem gần đây nhất của người dùng
            List<ProductViewHistory> viewHistory = viewHistoryRepository.findByUserIdOrderByLastViewedAtDesc(userId);
            if (!viewHistory.isEmpty()) {
                String latestViewedProductId = viewHistory.get(0).getProductId();
                log.info("Sản phẩm vừa xem gần đây nhất của user {} là: {}", userId, latestViewedProductId);
                
                // Trả về sản phẩm tương tự với sản phẩm xem gần nhất
                RecommendationResponse cbResponse = contentBasedService.getContentBasedRecommendations(latestViewedProductId, limit);
                
                // Điều chỉnh lại kiểu gợi ý và lời nhắn phù hợp
                cbResponse.setRecommendationType("HYBRID");
                cbResponse.setMessage("Gợi ý dựa trên sản phẩm bạn vừa xem");
                return cbResponse;
            }

            // Nếu người dùng thậm chí chưa xem sản phẩm nào, fallback về sản phẩm phổ biến nhất
            log.info("Người dùng {} không có lịch sử xem. Fallback về gợi ý sản phẩm phổ biến.", userId);
            return getPopular(limit);
        }

        // Trường hợp 2: Đã có đủ tương tác (>= 3) -> Áp dụng Hybrid Recommendation
        try {
            // Lấy kết quả Collaborative Filtering (lấy dư ra gấp đôi giới hạn để merge)
            RecommendationResponse cfResponse = collaborativeFilteringService.getCollaborativeRecommendations(userId, limit * 2);
            List<RecommendationDTO> cfList = cfResponse.getRecommendations();

            // Lấy sản phẩm xem gần đây nhất
            List<ProductViewHistory> viewHistory = viewHistoryRepository.findByUserIdOrderByLastViewedAtDesc(userId);
            List<RecommendationDTO> cbList = new ArrayList<>();
            
            if (!viewHistory.isEmpty()) {
                String latestProductId = viewHistory.get(0).getProductId();
                RecommendationResponse cbResponse = contentBasedService.getContentBasedRecommendations(latestProductId, limit * 2);
                cbList = cbResponse.getRecommendations();
            }

            // Merge 2 danh sách gợi ý theo trọng số (CF: 60%, CB: 40%)
            Map<String, RecommendationDTO> mergedMap = new HashMap<>();
            
            // Duyệt danh sách Collaborative Filtering
            for (RecommendationDTO item : cfList) {
                double score = 0.6 * item.getSimilarityScore();
                item.setSimilarityScore(score);
                item.setRecommendationType("HYBRID");
                mergedMap.put(item.getProductId(), item);
            }

            // Duyệt danh sách Content-Based và cộng dồn điểm
            for (RecommendationDTO item : cbList) {
                String pId = item.getProductId();
                double score = 0.4 * item.getSimilarityScore();
                
                if (mergedMap.containsKey(pId)) {
                    RecommendationDTO existing = mergedMap.get(pId);
                    existing.setSimilarityScore(existing.getSimilarityScore() + score);
                } else {
                    item.setSimilarityScore(score);
                    item.setRecommendationType("HYBRID");
                    mergedMap.put(pId, item);
                }
            }

            // Sắp xếp danh sách đã merge theo điểm số giảm dần
            List<RecommendationDTO> hybridList = new ArrayList<>(mergedMap.values());
            hybridList.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));

            // Nếu danh sách rỗng, fallback về sản phẩm phổ biến
            if (hybridList.isEmpty()) {
                log.warn("Không tính toán được gợi ý Hybrid cho người dùng {}. Fallback về sản phẩm phổ biến.", userId);
                return getPopular(limit);
            }

            // Cắt bớt danh sách gợi ý lưu vào Cache DB
            List<RecommendationDTO> cacheList = hybridList.stream().limit(20).collect(Collectors.toList());
            String jsonCache = objectMapper.writeValueAsString(cacheList);

            cacheRepository.findByCacheKey(cacheKey).ifPresent(cacheRepository::delete);

            // Lưu cache hết hạn sau 30 phút
            RecommendationCache newCache = RecommendationCache.builder()
                    .cacheKey(cacheKey)
                    .recommendationData(jsonCache)
                    .expiresAt(LocalDateTime.now().plusMinutes(30))
                    .build();
            cacheRepository.save(newCache);

            List<RecommendationDTO> resultList = hybridList.stream().limit(limit).collect(Collectors.toList());
            return RecommendationResponse.success(resultList, "HYBRID", "Gợi ý cá nhân hóa kết hợp sở thích và hành vi của bạn");

        } catch (Exception e) {
            log.error("Lỗi khi kết hợp gợi ý Hybrid cho người dùng: {}", userId, e);
            return getPopular(limit); // Gặp lỗi thì fallback sang sản phẩm bán chạy để đảm bảo UI hoạt động
        }
    }

    @Override
    @Transactional
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

            // Lưu cache DB hết hạn sau 1 giờ
            String jsonCache = objectMapper.writeValueAsString(popularList);
            cacheRepository.findByCacheKey(cacheKey).ifPresent(cacheRepository::delete);
            
            RecommendationCache newCache = RecommendationCache.builder()
                    .cacheKey(cacheKey)
                    .recommendationData(jsonCache)
                    .expiresAt(LocalDateTime.now().plusHours(1))
                    .build();
            cacheRepository.save(newCache);

            List<RecommendationDTO> resultList = popularList.stream().limit(limit).collect(Collectors.toList());
            return RecommendationResponse.success(resultList, "POPULAR", "Xu hướng mua sắm nổi bật");

        } catch (Exception e) {
            log.error("Lỗi khi tính toán gợi ý sản phẩm phổ biến", e);
            return RecommendationResponse.empty("Không thể lấy danh sách gợi ý phổ biến");
        }
    }
}
