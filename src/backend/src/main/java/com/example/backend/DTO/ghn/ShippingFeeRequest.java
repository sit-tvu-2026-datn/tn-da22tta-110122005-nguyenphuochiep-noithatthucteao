package com.example.backend.DTO.ghn;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class ShippingFeeRequest {
    @NotNull
    @Min(1)
    private Integer toDistrictId;

    @NotBlank
    private String toWardCode;

    private Integer serviceId;
    private Integer insuranceValue;
    private BigDecimal subtotal;
    private List<CartItem> items;

    @Data
    public static class CartItem {
        private String productId;
        private int quantity;
    }
}
