package com.example.backend.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;

/**
 * DTO biểu diễn hồ sơ sở thích của người dùng theo 4 chiều đặc tính sản phẩm.
 * Mỗi map: key = giá trị thuộc tính (vd "Sofa", "Gỗ Sồi"), value = điểm sở thích chuẩn hóa 0..1.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreferenceDTO {

    @Builder.Default
    private Map<String, Double> categoryScores = new HashMap<>();

    @Builder.Default
    private Map<String, Double> materialScores = new HashMap<>();

    @Builder.Default
    private Map<String, Double> colorScores = new HashMap<>();

    @Builder.Default
    private Map<String, Double> originScores = new HashMap<>();

    /**
     * Điểm từ khóa tìm kiếm: key = token đã chuẩn hóa (vd "sofa", "go"),
     * value = số lần tích lũy (raw count). Chuẩn hóa 0..1 khi chấm điểm sản phẩm.
     */
    @Builder.Default
    private Map<String, Double> searchKeywordScores = new HashMap<>();

    /** True nếu người dùng chưa có đủ dữ liệu để xây hồ sơ sở thích. */
    public boolean isEmpty() {
        return categoryScores.isEmpty() && materialScores.isEmpty()
                && colorScores.isEmpty() && originScores.isEmpty()
                && searchKeywordScores.isEmpty();
    }

    /** Lấy giá trị có điểm cao nhất trong một map (tiện hiển thị "bạn thích nhất...") */
    private String topOf(Map<String, Double> map) {
        return map.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    public String getTopCategory() {
        return topOf(categoryScores);
    }

    public String getTopMaterial() {
        return topOf(materialScores);
    }
}
