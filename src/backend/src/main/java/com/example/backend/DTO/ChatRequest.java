package com.example.backend.DTO;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class ChatRequest {
    private String message;

    private List<Map<String, String>> history;

    /**
     * Danh sách ProductID (theo đúng thứ tự hiển thị) của lần gợi ý sản phẩm GẦN NHẤT.
     * Frontend gửi kèm để backend map tham chiếu theo số thứ tự
     * (vd: "sản phẩm số 2", "mẫu thứ 3") -> ProductID tương ứng.
     */
    private List<String> lastRecommendedProductIds;
}