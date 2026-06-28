package com.example.backend.component;

import com.example.backend.model.Product;
import com.example.backend.repository.ProductRepository;
import com.example.backend.util.DimensionParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DimensionMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DimensionMigrationRunner.class);

    private final ProductRepository productRepository;

    public DimensionMigrationRunner(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("Checking for product dimensions migration...");
        List<Product> productsToMigrate = productRepository.findAll().stream()
                .filter(p -> p.getLength() == null || p.getWidth() == null || p.getHeight() == null || p.getWeight() == null)
                .collect(java.util.stream.Collectors.toList());

        if (productsToMigrate.isEmpty()) {
            log.info("All products already have structured dimensions. No migration needed.");
            return;
        }

        log.info("Found {} products to migrate to structured dimensions.", productsToMigrate.size());
        int migratedCount = 0;

        for (Product product : productsToMigrate) {
            try {
                DimensionParser.Dimensions dims = DimensionParser.parse(product.getSize());
                
                if (product.getLength() == null) {
                    product.setLength(dims.length());
                }
                if (product.getWidth() == null) {
                    product.setWidth(dims.width());
                }
                if (product.getHeight() == null) {
                    product.setHeight(dims.height());
                }
                if (product.getWeight() == null) {
                    product.setWeight(DimensionParser.FALLBACK_WEIGHT);
                }
                migratedCount++;
            } catch (Exception e) {
                log.error("Failed to migrate dimensions for product {}: {}", product.getProductId(), e.getMessage());
            }
        }

        productRepository.saveAll(productsToMigrate);
        log.info("Successfully migrated dimensions for {} products.", migratedCount);
    }
}
