package com.example.backend.DTO;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Một dòng thông số kỹ thuật (nhãn - giá trị) dùng trong thẻ chi tiết sản phẩm của chatbot.
 * Ví dụ: { label: "Chất liệu", value: "Gỗ sồi" }.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatSpecDTO {
    private String label;
    private String value;
}
