package com.example.backend.DTO;

import com.example.backend.model.OrderDetail;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Data
@NoArgsConstructor
public class OrderDetailDTO {
    private String orderDetailId;
    private ProductDTO product;  // dùng ProductDTO
    private int quantity;

    // --- Giá đã "đóng băng" tại thời điểm đặt hàng ---
    private BigDecimal unitPrice;          // = finalPrice (giá sau giảm / đơn vị)
    private BigDecimal originalUnitPrice;  // = giá gốc / đơn vị

    // --- Các trường phái sinh để Frontend chỉ việc hiển thị (không tự tính) ---
    private BigDecimal finalPrice;      // alias của unitPrice
    private BigDecimal discountAmount;  // (originalUnitPrice - unitPrice) / đơn vị
    private Integer discountPercent;    // % giảm suy ra từ giá gốc & giá bán
    private BigDecimal subtotal;        // finalPrice * quantity

    private Integer isFlashSaleFlag;

    public OrderDetailDTO(OrderDetail detail) {
        this.orderDetailId = detail.getOrderDetailId();
        this.product = new ProductDTO(detail.getProduct());
        this.quantity = detail.getQuantity();

        BigDecimal unit = detail.getUnitPrice() != null ? detail.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal original = detail.getOriginalUnitPrice() != null
                ? detail.getOriginalUnitPrice()
                : unit;

        this.unitPrice = unit;
        this.originalUnitPrice = original;
        this.finalPrice = unit;
        this.discountAmount = original.subtract(unit).max(BigDecimal.ZERO);
        this.discountPercent = (original.compareTo(BigDecimal.ZERO) > 0
                && original.compareTo(unit) > 0)
                ? this.discountAmount
                    .multiply(BigDecimal.valueOf(100))
                    .divide(original, 0, RoundingMode.HALF_UP)
                    .intValue()
                : 0;
        this.subtotal = unit.multiply(BigDecimal.valueOf(this.quantity));
        this.isFlashSaleFlag = detail.getIsFlashSale();
    }
}
