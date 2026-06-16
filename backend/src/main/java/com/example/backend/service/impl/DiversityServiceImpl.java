package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.service.DiversityService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;

/**
 * Triển khai thuật toán đa dạng hóa kết quả gợi ý bằng chiến lược greedy có ràng buộc.
 * Giữ nguyên ưu tiên theo điểm số nhưng chèn xen kẽ sản phẩm khác category khi cần,
 * để không có quá maxConsecutive sản phẩm cùng category đứng liền nhau.
 */
@Service
@Slf4j
public class DiversityServiceImpl implements DiversityService {

    @Override
    public List<RecommendationDTO> rerank(List<RecommendationDTO> items, int maxConsecutive) {
        if (items == null || items.size() <= maxConsecutive) {
            return items;
        }
        if (maxConsecutive < 1) {
            maxConsecutive = 1;
        }

        // 1. Sắp xếp theo điểm số giảm dần (giữ độ liên quan cao nhất lên đầu)
        LinkedList<RecommendationDTO> pool = new LinkedList<>(items);
        pool.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));

        List<RecommendationDTO> result = new ArrayList<>(items.size());

        String lastCategory = null;
        int consecutiveCount = 0;

        // 2. Lần lượt chọn phần tử điểm cao nhất, nếu vi phạm ràng buộc thì tìm phần tử khác category
        while (!pool.isEmpty()) {
            RecommendationDTO candidate;

            if (lastCategory != null && consecutiveCount >= maxConsecutive) {
                // Đã đủ maxConsecutive sản phẩm cùng category -> ưu tiên sản phẩm KHÁC category
                candidate = pollFirstDifferentCategory(pool, lastCategory);
                if (candidate == null) {
                    // Không còn category nào khác -> đành lấy phần tử điểm cao nhất còn lại
                    candidate = pool.pollFirst();
                }
            } else {
                candidate = pool.pollFirst();
            }

            // 3. Cập nhật bộ đếm chuỗi category liên tiếp
            String category = safeCategory(candidate);
            if (category.equals(lastCategory)) {
                consecutiveCount++;
            } else {
                lastCategory = category;
                consecutiveCount = 1;
            }
            result.add(candidate);
        }

        return result;
    }

    /**
     * Lấy ra (và xóa khỏi pool) phần tử đầu tiên có category khác với category đang bị lặp.
     * Trả về null nếu tất cả phần tử còn lại đều cùng category đó.
     */
    private RecommendationDTO pollFirstDifferentCategory(LinkedList<RecommendationDTO> pool, String blockedCategory) {
        for (int i = 0; i < pool.size(); i++) {
            RecommendationDTO item = pool.get(i);
            if (!safeCategory(item).equals(blockedCategory)) {
                pool.remove(i);
                return item;
            }
        }
        return null;
    }

    private String safeCategory(RecommendationDTO item) {
        return item.getCategoryName() == null ? "" : item.getCategoryName();
    }
}
