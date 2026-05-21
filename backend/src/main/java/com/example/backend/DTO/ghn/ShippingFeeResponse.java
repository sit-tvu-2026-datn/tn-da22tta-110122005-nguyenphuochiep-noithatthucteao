package com.example.backend.DTO.ghn;

import lombok.Data;

@Data
public class ShippingFeeResponse {
    private Integer serviceId;
    private Integer totalFee;
    private Integer serviceFee;
    private Integer insuranceFee;
    private boolean freeShipping;
    private String freeShippingReason;
}
