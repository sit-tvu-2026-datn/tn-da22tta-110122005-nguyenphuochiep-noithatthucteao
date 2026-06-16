package com.example.backend.service;

import com.example.backend.DTO.RecommendationDTO;

import java.util.List;

/**
 * Dịch vụ đa dạng hóa kết quả gợi ý (Diversity Reranking).
 * Tránh việc danh sách trả về toàn sản phẩm cùng một danh mục liên tiếp nhau,
 * trong khi vẫn giữ độ liên quan (relevance) tổng thể cao.
 */
public interface DiversityService {

    /**
     * Sắp xếp lại danh sách gợi ý sao cho không có quá {@code maxConsecutive}
     * sản phẩm cùng category đứng liền kề nhau.
     *
     * @param items           danh sách gợi ý (chưa cần sắp xếp trước)
     * @param maxConsecutive  số sản phẩm tối đa cùng category được phép đứng liên tiếp
     * @return danh sách đã đa dạng hóa
     */
    List<RecommendationDTO> rerank(List<RecommendationDTO> items, int maxConsecutive);
}
