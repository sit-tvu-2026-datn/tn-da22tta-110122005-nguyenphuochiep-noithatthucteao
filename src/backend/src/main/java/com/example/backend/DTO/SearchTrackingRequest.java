package com.example.backend.DTO;

import lombok.Data;

/**
 * DTO nhận dữ liệu yêu cầu theo dõi từ khóa tìm kiếm của người dùng.
 */
@Data
public class SearchTrackingRequest {
    private String userId;
    private String keyword;
}
