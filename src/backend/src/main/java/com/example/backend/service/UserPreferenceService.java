package com.example.backend.service;

import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.DTO.UserPreferenceDTO;

import java.util.Map;

/**
 * Dịch vụ xây dựng và sử dụng hồ sơ sở thích người dùng (User Preference Profile).
 * Tổng hợp lịch sử tương tác để biết người dùng ưa thích Category / Material / Color / Origin nào,
 * từ đó tạo gợi ý "Dành riêng cho bạn" (For You).
 */
public interface UserPreferenceService {

    /**
     * Lấy hồ sơ sở thích của người dùng (tự build nếu chưa có hoặc đã bị xóa).
     */
    UserPreferenceDTO getProfile(String userId);

    /**
     * Xây dựng lại hồ sơ sở thích từ dữ liệu tương tác mới nhất và lưu vào DB.
     */
    UserPreferenceDTO buildProfile(String userId);

    /**
     * Xóa hồ sơ sở thích (gọi khi người dùng có tương tác mới để buộc tính lại).
     */
    void invalidateProfile(String userId);

    /**
     * Ghi nhận từ khóa tìm kiếm của người dùng vào hồ sơ sở thích (chiều searchKeywordScores).
     * Không đụng schema — lưu trong cột JSON preference_data có sẵn.
     */
    void addSearchKeywords(String userId, String keyword);

    /**
     * Lấy gợi ý "Dành riêng cho bạn" dựa trên hồ sơ sở thích đã đa dạng hóa.
     */
    RecommendationResponse getForYouRecommendations(String userId, int limit);

    /**
     * Bản đồ điểm sở thích theo sản phẩm (productId -> prefScore 0..1).
     * Phục vụ Dynamic Hybrid dùng làm hệ số boost cá nhân hóa.
     */
    Map<String, Double> getProductPreferenceScores(String userId);
}
