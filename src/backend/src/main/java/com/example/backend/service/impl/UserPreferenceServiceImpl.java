package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.DTO.UserPreferenceDTO;
import com.example.backend.model.Product;
import com.example.backend.model.RecommendationCache;
import com.example.backend.model.UserPreferenceProfile;
import com.example.backend.model.UserProductInteraction;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.repository.UserPreferenceProfileRepository;
import com.example.backend.repository.UserProductInteractionRepository;
import com.example.backend.service.DiversityService;
import com.example.backend.service.UserPreferenceService;
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
 * Triển khai xây dựng hồ sơ sở thích và gợi ý "Dành riêng cho bạn".
 *
 * Điểm sở thích từng chiều = tổng interactionScore của các sản phẩm thuộc giá trị đó,
 * sau đó chuẩn hóa theo max của chiều (về 0..1).
 *
 * Preference Score của một sản phẩm:
 *   prefScore(p) = 0.40*catScore + 0.30*matScore + 0.20*colorScore + 0.10*originScore
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserPreferenceServiceImpl implements UserPreferenceService {

    private final UserProductInteractionRepository interactionRepository;
    private final ProductRepository productRepository;
    private final UserPreferenceProfileRepository profileRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final RecommendationCacheWriter cacheWriter;
    private final DiversityService diversityService;
    private final ObjectMapper objectMapper;

    // Trọng số từng chiều khi chấm điểm một sản phẩm
    private static final double W_CATEGORY = 0.40;
    private static final double W_MATERIAL = 0.30;
    private static final double W_COLOR = 0.20;
    private static final double W_ORIGIN = 0.10;

    // Ngưỡng coi là "đã tương tác mạnh" -> loại khỏi gợi ý For You
    private static final double STRONG_INTERACTION = 3.0;
    private static final int MAX_CONSECUTIVE_CATEGORY = 3;

    @Override
    public UserPreferenceDTO getProfile(String userId) {
        Optional<UserPreferenceProfile> existing = profileRepository.findByUserId(userId);
        if (existing.isPresent()) {
            try {
                return objectMapper.readValue(existing.get().getPreferenceData(), UserPreferenceDTO.class);
            } catch (Exception e) {
                log.error("Lỗi parse hồ sơ sở thích của user {}, build lại", userId, e);
            }
        }
        return buildProfile(userId);
    }

    @Override
    @Transactional
    public UserPreferenceDTO buildProfile(String userId) {
        log.info("Xây dựng hồ sơ sở thích cho người dùng: {}", userId);

        List<UserProductInteraction> interactions = interactionRepository.findByUserId(userId);
        UserPreferenceDTO dto = new UserPreferenceDTO();

        if (interactions.isEmpty()) {
            return dto; // hồ sơ rỗng, không lưu
        }

        // Nạp product cho các sản phẩm đã tương tác
        Set<String> productIds = interactions.stream()
                .map(UserProductInteraction::getProductId)
                .collect(Collectors.toSet());
        Map<String, Product> productMap = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getProductId, p -> p));

        Map<String, Double> catRaw = new HashMap<>();
        Map<String, Double> matRaw = new HashMap<>();
        Map<String, Double> colorRaw = new HashMap<>();
        Map<String, Double> originRaw = new HashMap<>();

        for (UserProductInteraction inter : interactions) {
            Product p = productMap.get(inter.getProductId());
            if (p == null) continue;
            double score = inter.getInteractionScore();

            addWeight(catRaw, categoryOf(p), score);
            addWeight(matRaw, p.getMaterial(), score);
            addWeight(colorRaw, p.getColor(), score);
            addWeight(originRaw, p.getOrigin(), score);
        }

        dto.setCategoryScores(normalize(catRaw));
        dto.setMaterialScores(normalize(matRaw));
        dto.setColorScores(normalize(colorRaw));
        dto.setOriginScores(normalize(originRaw));

        // Lưu hồ sơ (upsert)
        try {
            String json = objectMapper.writeValueAsString(dto);
            UserPreferenceProfile profile = profileRepository.findByUserId(userId)
                    .orElseGet(() -> UserPreferenceProfile.builder().userId(userId).build());
            profile.setPreferenceData(json);
            profileRepository.save(profile);
        } catch (Exception e) {
            log.error("Lỗi khi lưu hồ sơ sở thích của user {}", userId, e);
        }

        return dto;
    }

    @Override
    @Transactional
    public void invalidateProfile(String userId) {
        profileRepository.deleteByUserId(userId);
    }

    @Override
    @Transactional
    public RecommendationResponse getForYouRecommendations(String userId, int limit) {
        log.info("Yêu cầu gợi ý For You cho người dùng: {}, giới hạn: {}", userId, limit);
        String cacheKey = "foryou:" + userId;

        // 1. Thử cache DB
        try {
            Optional<RecommendationCache> cached = cacheRepository.findByCacheKeyAndExpiresAtAfter(cacheKey, LocalDateTime.now());
            if (cached.isPresent()) {
                List<RecommendationDTO> recs = objectMapper.readValue(
                        cached.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {});
                return RecommendationResponse.success(
                        recs.stream().limit(limit).collect(Collectors.toList()),
                        "FOR_YOU", "Tuyển chọn dựa trên sở thích của bạn (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache For You cho user {}", userId, e);
        }

        UserPreferenceDTO profile = getProfile(userId);
        if (profile.isEmpty()) {
            return RecommendationResponse.empty("Chưa đủ dữ liệu sở thích");
        }

        // 2. Loại các sản phẩm người dùng đã tương tác mạnh
        Set<String> strongInteracted = interactionRepository.findByUserId(userId).stream()
                .filter(i -> i.getInteractionScore() >= STRONG_INTERACTION)
                .map(UserProductInteraction::getProductId)
                .collect(Collectors.toSet());

        // 3. Chấm điểm toàn bộ sản phẩm theo hồ sơ sở thích
        List<RecommendationDTO> scored = new ArrayList<>();
        for (Product p : productRepository.findAll()) {
            if (strongInteracted.contains(p.getProductId())) continue;
            double pref = preferenceScore(profile, p);
            if (pref > 0.0) {
                RecommendationDTO dto = new RecommendationDTO(p);
                dto.setSimilarityScore(pref);
                dto.setRecommendationType("FOR_YOU");
                scored.add(dto);
            }
        }

        if (scored.isEmpty()) {
            return RecommendationResponse.empty("Chưa tìm được sản phẩm phù hợp sở thích");
        }

        // 4. Sắp xếp + đa dạng hóa
        scored.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));
        List<RecommendationDTO> top = scored.stream().limit(20).collect(Collectors.toList());
        top = diversityService.rerank(top, MAX_CONSECUTIVE_CATEGORY);

        // 5. Lưu cache (TTL 30 phút)
        try {
            String json = objectMapper.writeValueAsString(top);
            // UPSERT atomic, thread-safe
            cacheWriter.put(cacheKey, json, LocalDateTime.now().plusMinutes(30));
        } catch (Exception e) {
            log.error("Lỗi khi lưu cache For You cho user {}", userId, e);
        }

        return RecommendationResponse.success(
                top.stream().limit(limit).collect(Collectors.toList()),
                "FOR_YOU", "Tuyển chọn dựa trên sở thích của bạn");
    }

    @Override
    public Map<String, Double> getProductPreferenceScores(String userId) {
        UserPreferenceDTO profile = getProfile(userId);
        if (profile.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Double> result = new HashMap<>();
        for (Product p : productRepository.findAll()) {
            double pref = preferenceScore(profile, p);
            if (pref > 0.0) {
                result.put(p.getProductId(), pref);
            }
        }
        return result;
    }

    // ---------- Hàm hỗ trợ ----------

    private double preferenceScore(UserPreferenceDTO profile, Product p) {
        double cat = valueOf(profile.getCategoryScores(), categoryOf(p));
        double mat = valueOf(profile.getMaterialScores(), p.getMaterial());
        double color = valueOf(profile.getColorScores(), p.getColor());
        double origin = valueOf(profile.getOriginScores(), p.getOrigin());
        return W_CATEGORY * cat + W_MATERIAL * mat + W_COLOR * color + W_ORIGIN * origin;
    }

    private double valueOf(Map<String, Double> map, String key) {
        if (map == null || key == null) return 0.0;
        return map.getOrDefault(key, 0.0);
    }

    private String categoryOf(Product p) {
        if (p.getCategory() != null && p.getCategory().getCategoryName() != null) {
            return p.getCategory().getCategoryName();
        }
        return null;
    }

    private void addWeight(Map<String, Double> map, String key, double score) {
        if (key == null || key.trim().isEmpty()) return;
        map.merge(key, score, Double::sum);
    }

    /** Chuẩn hóa map về 0..1 bằng cách chia cho giá trị lớn nhất. */
    private Map<String, Double> normalize(Map<String, Double> raw) {
        Map<String, Double> normalized = new HashMap<>();
        double max = raw.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        if (max <= 0.0) return normalized;
        for (Map.Entry<String, Double> e : raw.entrySet()) {
            normalized.put(e.getKey(), e.getValue() / max);
        }
        return normalized;
    }
}
