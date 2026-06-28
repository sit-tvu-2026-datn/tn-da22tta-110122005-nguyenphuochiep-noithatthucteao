package com.example.backend.service.impl;

import com.example.backend.DTO.ProductDTO;
import com.example.backend.exception.FileUploadException;
import com.example.backend.model.Product;
import com.example.backend.model.ProductImage;
import com.example.backend.repository.ProductRepository;
import com.example.backend.service.ProductService;
import com.example.backend.service.SupabaseStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.util.stream.Collectors;
import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import java.util.Objects;

@Service
public class ProductServiceImpl implements ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductServiceImpl.class);

    private final ProductRepository productRepository;
    private final SupabaseStorageService supabaseStorageService;

    public ProductServiceImpl(
            ProductRepository productRepository,
            SupabaseStorageService supabaseStorageService
    ) {
        this.productRepository = productRepository;
        this.supabaseStorageService = supabaseStorageService;
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
        product.setLength(productDTO.getLength());
        product.setWidth(productDTO.getWidth());
        product.setHeight(productDTO.getHeight());
        product.setWeight(productDTO.getWeight());
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
            String previousArLink = existing.getArLink();

            existing.setProductName(productDTO.getProductName());
            existing.setPrice(productDTO.getPrice());
            existing.setDescription(productDTO.getDescription());
            existing.setQuantity(productDTO.getQuantity());
            existing.setDiscount(productDTO.getDiscount());
            existing.setCategoryId(productDTO.getCategoryId());
            existing.setSize(productDTO.getSize());
            existing.setLength(productDTO.getLength());
            existing.setWidth(productDTO.getWidth());
            existing.setHeight(productDTO.getHeight());
            existing.setWeight(productDTO.getWeight());
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

            ProductDTO savedProduct = new ProductDTO(productRepository.save(existing));
            deleteOldProductModelIfChanged(previousArLink, savedProduct.getArLink());
            return savedProduct;
        }).orElseThrow(() -> new RuntimeException("Product not found"));
    }

    @Override
    public void deleteProduct(String id) {
        String arLink = productRepository.findById(id)
                .map(Product::getArLink)
                .orElse(null);

        productRepository.deleteById(id);
        deleteProductModelQuietly(arLink);
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

    private void deleteOldProductModelIfChanged(String previousArLink, String currentArLink) {
        if (StringUtils.hasText(previousArLink) && !Objects.equals(previousArLink, currentArLink)) {
            deleteProductModelQuietly(previousArLink);
        }
    }

    private void deleteProductModelQuietly(String publicUrl) {
        if (!StringUtils.hasText(publicUrl)) {
            return;
        }

        try {
            supabaseStorageService.deleteProductModelByPublicUrl(publicUrl);
        } catch (FileUploadException e) {
            log.warn("Could not delete old product model from Supabase: {}", publicUrl, e);
        }
    }
}
