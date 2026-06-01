package com.example.backend.DTO;

import lombok.Data;

/**
 * DTO nhận dữ liệu yêu cầu theo dõi lượt xem sản phẩm của người dùng.
 */
@Data
public class ViewTrackingRequest {
    private String userId;
    private String productId;
}
