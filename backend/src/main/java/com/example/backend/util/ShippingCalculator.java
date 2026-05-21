package com.example.backend.util;

import com.example.backend.config.GhnProperties;
import com.example.backend.config.ShippingConstants;
import com.example.backend.model.OrderDetail;
import com.example.backend.model.Product;

import java.math.BigDecimal;
import java.util.List;

/**
 * Calculates aggregated package dimensions for shipping.
 * Strategy for multi-item carts:
 *   - totalWeight = sum(weight * quantity)
 *   - length = max(all product lengths)
 *   - width = max(all product widths)
 *   - height = sum(all product heights * quantity) — vertical stacking
 */
public final class ShippingCalculator {

    private ShippingCalculator() {}

    public record PackageSpec(int length, int width, int height, int weight) {}

    /**
     * Calculate package specification from order details.
     */
    public static PackageSpec calculate(List<OrderDetail> items, GhnProperties defaults) {
        if (items == null || items.isEmpty()) {
            return new PackageSpec(
                    defaults.getDefaultLength(),
                    defaults.getDefaultWidth(),
                    defaults.getDefaultHeight(),
                    defaults.getDefaultWeight()
            );
        }

        int maxLength = 0;
        int maxWidth = 0;
        int totalHeight = 0;
        int totalWeight = 0;

        for (OrderDetail item : items) {
            Product product = item.getProduct();
            int qty = Math.max(1, item.getQuantity());

            int itemLength = (product != null && product.getLength() != null && product.getLength() > 0)
                    ? product.getLength() : defaults.getDefaultLength();
            int itemWidth = (product != null && product.getWidth() != null && product.getWidth() > 0)
                    ? product.getWidth() : defaults.getDefaultWidth();
            int itemHeight = (product != null && product.getHeight() != null && product.getHeight() > 0)
                    ? product.getHeight() : defaults.getDefaultHeight();
            int itemWeight = (product != null && product.getWeight() != null && product.getWeight() > 0)
                    ? product.getWeight() : defaults.getDefaultWeight();

            maxLength = Math.max(maxLength, itemLength);
            maxWidth = Math.max(maxWidth, itemWidth);
            totalHeight += itemHeight * qty;
            totalWeight += itemWeight * qty;
        }

        return new PackageSpec(
                maxLength > 0 ? maxLength : defaults.getDefaultLength(),
                maxWidth > 0 ? maxWidth : defaults.getDefaultWidth(),
                totalHeight > 0 ? totalHeight : defaults.getDefaultHeight(),
                totalWeight > 0 ? totalWeight : defaults.getDefaultWeight()
        );
    }

    /**
     * Check if subtotal qualifies for free shipping.
     */
    public static boolean isFreeShipping(BigDecimal subtotal) {
        if (subtotal == null) {
            return false;
        }
        return subtotal.compareTo(BigDecimal.valueOf(ShippingConstants.FREE_SHIPPING_THRESHOLD)) >= 0;
    }
}
