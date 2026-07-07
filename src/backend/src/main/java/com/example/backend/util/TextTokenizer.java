package com.example.backend.util;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Tiện ích chuẩn hóa và tách từ (tokenize) văn bản tiếng Việt đơn giản.
 * Dùng chung cho lưu từ khóa tìm kiếm và tính độ khớp nội dung sản phẩm.
 *
 * Quy tắc: bỏ dấu tiếng Việt (NFD + loại dấu), Đ/đ -> D/d, đưa về chữ thường,
 * loại ký tự đặc biệt, tách theo khoảng trắng và bỏ các từ quá ngắn (<= 1 ký tự).
 */
public final class TextTokenizer {

    private TextTokenizer() {
    }

    public static List<String> tokenize(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new ArrayList<>();
        }

        // Loại bỏ dấu tiếng Việt để matching tốt hơn
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "")
                .replaceAll("Đ", "D")
                .replaceAll("đ", "d");

        // Loại bỏ ký tự đặc biệt, đưa về viết thường
        normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", " ").toLowerCase();

        // Tách từ bằng khoảng trắng, bỏ các từ quá ngắn như ký tự đơn
        String[] words = normalized.split("\\s+");
        return Arrays.stream(words)
                .filter(w -> w.length() > 1)
                .collect(Collectors.toList());
    }
}
