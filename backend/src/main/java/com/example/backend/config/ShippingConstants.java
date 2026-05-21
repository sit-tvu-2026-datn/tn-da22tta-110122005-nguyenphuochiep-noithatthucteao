package com.example.backend.config;

/**
 * Constants for shipping policy and calculation.
 */
public final class ShippingConstants {

    /** Orders with subtotal >= this amount (VND) qualify for free shipping. */
    public static final long FREE_SHIPPING_THRESHOLD = 15_000_000L;

    private ShippingConstants() {}
}
