package com.example.backend.service;

import com.example.backend.DTO.ProductDTO;
import java.util.List;
import java.util.Optional;

public interface ProductService {
    List<ProductDTO> getAllProducts();
    Optional<ProductDTO> getProductById(String id);
    ProductDTO createProduct(ProductDTO productDTO);
    ProductDTO updateProduct(String id, ProductDTO productDTO);
    void deleteProduct(String id);

    List<ProductDTO> getProductsByCategoryId(String categoryId);
    List<ProductDTO> getRelatedProducts(String productId);
}
