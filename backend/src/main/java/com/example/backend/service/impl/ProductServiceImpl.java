package com.example.backend.service.impl;

import com.example.backend.DTO.ProductDTO;
import com.example.backend.model.Product;
import com.example.backend.model.ProductImage;
import com.example.backend.repository.ProductRepository;
import com.example.backend.service.ProductService;
import org.springframework.stereotype.Service;
import java.util.stream.Collectors;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;

    public ProductServiceImpl(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public List<ProductDTO> getAllProducts() {
        return productRepository.findAll().stream().map(ProductDTO::new).collect(Collectors.toList());
    }

    @Override
    public Optional<ProductDTO> getProductById(String id) {
        return productRepository.findById(id).map(ProductDTO::new);
    }

    @Override
    public ProductDTO createProduct(ProductDTO productDTO) {
        Product product = new Product();
        product.setProductId(productDTO.getProductId());
        product.setProductName(productDTO.getProductName());
        product.setPrice(productDTO.getPrice());
        product.setDescription(productDTO.getDescription());
        product.setQuantity(productDTO.getQuantity());
        product.setDiscount(productDTO.getDiscount());
        product.setCategoryId(productDTO.getCategoryId());
        product.setSize(productDTO.getSize());
        product.setColor(productDTO.getColor());
        product.setMaterial(productDTO.getMaterial());
        product.setWarranty(productDTO.getWarranty());
        product.setOrigin(productDTO.getOrigin());
        product.setArLink(productDTO.getArLink());
        product.setArModelUsdz(productDTO.getArModelUsdz());

        if (productDTO.getImageUrls() != null) {
            List<ProductImage> images = productDTO.getImageUrls().stream()
                    .map(url -> {
                        ProductImage img = new ProductImage();
                        img.setUrl(url);
                        img.setProduct(product);
                        return img;
                    }).collect(Collectors.toList());
            product.setImages(images);
        } else {
            product.setImages(new ArrayList<>());
        }

        return new ProductDTO(productRepository.save(product));
    }

    @Override
    public ProductDTO updateProduct(String id, ProductDTO productDTO) {
        return productRepository.findById(id).map(existing -> {
            existing.setProductName(productDTO.getProductName());
            existing.setPrice(productDTO.getPrice());
            existing.setDescription(productDTO.getDescription());
            existing.setQuantity(productDTO.getQuantity());
            existing.setDiscount(productDTO.getDiscount());
            existing.setCategoryId(productDTO.getCategoryId());
            existing.setSize(productDTO.getSize());
            existing.setColor(productDTO.getColor());
            existing.setMaterial(productDTO.getMaterial());
            existing.setWarranty(productDTO.getWarranty());
            existing.setOrigin(productDTO.getOrigin());
            existing.setArLink(productDTO.getArLink());
            existing.setArModelUsdz(productDTO.getArModelUsdz());

            if (existing.getImages() != null) {
                existing.getImages().clear();
            } else {
                existing.setImages(new ArrayList<>());
            }

            if (productDTO.getImageUrls() != null) {
                List<ProductImage> newImages = productDTO.getImageUrls().stream()
                        .map(url -> {
                            ProductImage img = new ProductImage();
                            img.setUrl(url);
                            img.setProduct(existing);
                            return img;
                        }).collect(Collectors.toList());
                existing.getImages().addAll(newImages);
            }

            return new ProductDTO(productRepository.save(existing));
        }).orElseThrow(() -> new RuntimeException("Product not found"));
    }

    @Override
    public void deleteProduct(String id) {
        productRepository.deleteById(id);
    }

    @Override
    public List<ProductDTO> getProductsByCategoryId(String categoryId) {
        return productRepository.findByCategoryId(categoryId).stream().map(ProductDTO::new).collect(Collectors.toList());
    }

    @Override
    public List<ProductDTO> getRelatedProducts(String productId) {
        Product current = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        return productRepository.findRelatedProducts(current.getCategoryId(), productId)
                .stream().map(ProductDTO::new).collect(Collectors.toList());
    }
}
