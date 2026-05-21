package com.example.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Entity
@Table(name = "Products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @Column(name = "product_id", length = 50)
    private String productId;

    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    @Column(columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private java.util.List<ProductImage> images = new java.util.ArrayList<>();

    @Column(name = "ar_link", length = 1000)
    private String arLink;

    private String arModelUsdz;

    @Column(columnDefinition = "INT DEFAULT 0")
    private int quantity;

    @Column(precision = 5, scale = 2)
    private BigDecimal discount;

    @Column(name = "category_id", length = 50)
    private String categoryId;

    @Column(length = 50)
    private String size;

    @Column(name = "length")
    private Integer length;

    @Column(name = "width")
    private Integer width;

    @Column(name = "height")
    private Integer height;

    @Column(name = "weight")
    private Integer weight;

    @Column(length = 50)
    private String color;

    @Column(length = 100)
    private String material;

    @Column(length = 50)
    private String warranty;

    @Column(length = 100)
    private String origin;

    @Column(name = "created_at", updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @ManyToOne
    @JoinColumn(name = "category_id", referencedColumnName = "category_id", insertable = false, updatable = false)
    private Category category;
}
