package com.example.backend.util;

import com.example.backend.config.GhnProperties;
import com.example.backend.model.OrderDetail;
import com.example.backend.model.Product;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShippingCalculatorTest {

    private GhnProperties defaults;

    @BeforeEach
    void setUp() {
        defaults = new GhnProperties();
        defaults.setDefaultLength(20);
        defaults.setDefaultWidth(20);
        defaults.setDefaultHeight(20);
        defaults.setDefaultWeight(1000);
    }

    @Test
    void testCalculateEmptyOrNullList() {
        ShippingCalculator.PackageSpec spec1 = ShippingCalculator.calculate(null, defaults);
        assertEquals(20, spec1.length());
        assertEquals(20, spec1.width());
        assertEquals(20, spec1.height());
        assertEquals(1000, spec1.weight());

        ShippingCalculator.PackageSpec spec2 = ShippingCalculator.calculate(new ArrayList<>(), defaults);
        assertEquals(20, spec2.length());
        assertEquals(20, spec2.width());
        assertEquals(20, spec2.height());
        assertEquals(1000, spec2.weight());
    }

    @Test
    void testCalculateSingleItemWithDimensions() {
        List<OrderDetail> items = new ArrayList<>();
        OrderDetail detail = new OrderDetail();
        detail.setQuantity(2);
        
        Product product = new Product();
        product.setLength(120);
        product.setWidth(60);
        product.setHeight(75);
        product.setWeight(5000);
        detail.setProduct(product);
        items.add(detail);

        ShippingCalculator.PackageSpec spec = ShippingCalculator.calculate(items, defaults);
        assertEquals(120, spec.length());
        assertEquals(60, spec.width());
        assertEquals(150, spec.height());
        assertEquals(10000, spec.weight());
    }

    @Test
    void testCalculateMultipleItemsWithDimensions() {
        List<OrderDetail> items = new ArrayList<>();
        
        OrderDetail detail1 = new OrderDetail();
        detail1.setQuantity(1);
        Product product1 = new Product();
        product1.setLength(100);
        product1.setWidth(50);
        product1.setHeight(40);
        product1.setWeight(2000);
        detail1.setProduct(product1);
        items.add(detail1);

        OrderDetail detail2 = new OrderDetail();
        detail2.setQuantity(3);
        Product product2 = new Product();
        product2.setLength(120);
        product2.setWidth(80);
        product2.setHeight(30);
        product2.setWeight(4000);
        detail2.setProduct(product2);
        items.add(detail2);

        ShippingCalculator.PackageSpec spec = ShippingCalculator.calculate(items, defaults);
        assertEquals(120, spec.length());
        assertEquals(80, spec.width());
        assertEquals(130, spec.height());
        assertEquals(14000, spec.weight());
    }

    @Test
    void testCalculateItemsWithNullDimensions() {
        List<OrderDetail> items = new ArrayList<>();
        OrderDetail detail = new OrderDetail();
        detail.setQuantity(2);
        
        Product product = new Product();
        product.setLength(null);
        product.setWidth(null);
        product.setHeight(null);
        product.setWeight(null);
        detail.setProduct(product);
        items.add(detail);

        ShippingCalculator.PackageSpec spec = ShippingCalculator.calculate(items, defaults);
        assertEquals(20, spec.length());
        assertEquals(20, spec.width());
        assertEquals(40, spec.height());
        assertEquals(2000, spec.weight());
    }

    @Test
    void testIsFreeShipping() {
        assertFalse(ShippingCalculator.isFreeShipping(BigDecimal.valueOf(14_999_999)));
        assertTrue(ShippingCalculator.isFreeShipping(BigDecimal.valueOf(15_000_000)));
        assertTrue(ShippingCalculator.isFreeShipping(BigDecimal.valueOf(15_000_001)));
        assertFalse(ShippingCalculator.isFreeShipping(null));
    }
}
