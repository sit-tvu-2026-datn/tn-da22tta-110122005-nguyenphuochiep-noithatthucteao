package com.example.backend.service.impl;

import com.example.backend.DTO.RecommendationDTO;
import com.example.backend.DTO.RecommendationResponse;
import com.example.backend.model.Product;
import com.example.backend.model.RecommendationCache;
import com.example.backend.repository.ProductRepository;
import com.example.backend.repository.RecommendationCacheRepository;
import com.example.backend.service.ContentBasedService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Triển khai thuật toán gợi ý dựa trên nội dung (Content-Based Filtering).
 * Sử dụng phân tích văn bản TF-IDF (Term Frequency-Inverse Document Frequency)
 * và đo lường khoảng cách giữa các vector bằng độ tương đồng Cosine.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContentBasedServiceImpl implements ContentBasedService {

    private final ProductRepository productRepository;
    private final RecommendationCacheRepository cacheRepository;
    private final RecommendationCacheWriter cacheWriter;
    private final ObjectMapper objectMapper;

    // Bộ nhớ đệm TF-IDF vector trên RAM để tính toán nhanh hơn
    private final Map<String, Map<String, Double>> tfIdfVectors = new ConcurrentHashMap<>();
    private final Map<String, Product> productMemoryMap = new ConcurrentHashMap<>();
    private boolean isMatrixBuilt = false;

    @Override
    @Transactional
    public RecommendationResponse getContentBasedRecommendations(String productId, int limit) {
        log.info("Yêu cầu gợi ý Content-Based cho sản phẩm: {}, giới hạn: {}", productId, limit);

        // 1. Kiểm tra sản phẩm mục tiêu có tồn tại không
        Optional<Product> targetOpt = productRepository.findById(productId);
        if (targetOpt.isEmpty()) {
            log.warn("Không tìm thấy sản phẩm mục tiêu: {}", productId);
            return RecommendationResponse.empty("Không tìm thấy sản phẩm yêu cầu");
        }

        String cacheKey = "content:" + productId;

        // 2. Thử lấy từ Database Cache trước
        try {
            Optional<RecommendationCache> cachedData = cacheRepository.findByCacheKeyAndExpiresAtAfter(cacheKey, LocalDateTime.now());
            if (cachedData.isPresent()) {
                log.info("Lấy kết quả gợi ý Content-Based từ cache DB cho sản phẩm: {}", productId);
                List<RecommendationDTO> recommendations = objectMapper.readValue(
                        cachedData.get().getRecommendationData(),
                        new TypeReference<List<RecommendationDTO>>() {}
                );
                // Cắt theo giới hạn yêu cầu
                List<RecommendationDTO> limitedRecs = recommendations.stream().limit(limit).collect(Collectors.toList());
                return RecommendationResponse.success(limitedRecs, "CONTENT_BASED", "Sản phẩm tương tự dựa trên đặc tính sản phẩm (Cached)");
            }
        } catch (Exception e) {
            log.error("Lỗi khi đọc cache DB gợi ý Content-Based cho sản phẩm: {}", productId, e);
        }

        // 3. Nếu Cache miss, tiến hành tính toán
        try {
            // Đảm bảo ma trận TF-IDF đã được khởi tạo
            ensureTfIdfMatrixBuilt();

            if (!tfIdfVectors.containsKey(productId)) {
                log.warn("Sản phẩm {} không có trong ma trận TF-IDF", productId);
                return RecommendationResponse.empty("Không đủ dữ liệu gợi ý");
            }

            Map<String, Double> targetVector = tfIdfVectors.get(productId);
            List<RecommendationDTO> allRecommendations = new ArrayList<>();

            // Tính Cosine Similarity với mọi sản phẩm khác trong hệ thống
            for (Map.Entry<String, Map<String, Double>> entry : tfIdfVectors.entrySet()) {
                String otherProductId = entry.getKey();
                if (otherProductId.equals(productId)) {
                    continue; // Bỏ qua chính nó
                }

                Map<String, Double> otherVector = entry.getValue();
                double similarity = calculateCosineSimilarity(targetVector, otherVector);

                if (similarity > 0.05) { // Chỉ lấy sản phẩm có mức độ tương đồng lớn hơn 5%
                    Product otherProduct = productMemoryMap.get(otherProductId);
                    if (otherProduct != null) {
                        RecommendationDTO dto = new RecommendationDTO(otherProduct);
                        dto.setSimilarityScore(similarity);
                        dto.setRecommendationType("CONTENT_BASED");
                        allRecommendations.add(dto);
                    }
                }
            }

            // Sắp xếp giảm dần theo điểm tương đồng
            allRecommendations.sort((a, b) -> Double.compare(b.getSimilarityScore(), a.getSimilarityScore()));

            // Lưu toàn bộ danh sách gợi ý vào Cache DB (tối đa 20 sản phẩm để lưu trữ)
            List<RecommendationDTO> cacheList = allRecommendations.stream().limit(20).collect(Collectors.toList());
            String jsonCache = objectMapper.writeValueAsString(cacheList);

            // Lưu cache mới hết hạn sau 2 giờ (UPSERT atomic, thread-safe)
            cacheWriter.put(cacheKey, jsonCache, LocalDateTime.now().plusHours(2));

            // Trả về số lượng theo yêu cầu limit
            List<RecommendationDTO> resultList = allRecommendations.stream().limit(limit).collect(Collectors.toList());
            return RecommendationResponse.success(resultList, "CONTENT_BASED", "Sản phẩm tương tự dựa trên đặc tính sản phẩm");

        } catch (Exception e) {
            log.error("Lỗi khi tính toán gợi ý Content-Based cho sản phẩm: {}", productId, e);
            return RecommendationResponse.empty("Lỗi hệ thống khi tính toán gợi ý");
        }
    }

    @Override
    public synchronized void invalidateCache() {
        log.info("Xóa bộ nhớ đệm TF-IDF trên RAM để chuẩn bị tính toán lại");
        tfIdfVectors.clear();
        productMemoryMap.clear();
        isMatrixBuilt = false;
    }

    /**
     * Đảm bảo ma trận TF-IDF đã được dựng trong bộ nhớ RAM.
     */
    private synchronized void ensureTfIdfMatrixBuilt() {
        if (isMatrixBuilt) {
            return;
        }
        buildTfIdfMatrix();
    }

    /**
     * Xây dựng ma trận TF-IDF cho tất cả sản phẩm hiện có.
     */
    private void buildTfIdfMatrix() {
        log.info("Bắt đầu xây dựng ma trận TF-IDF cho tất cả sản phẩm...");
        List<Product> products = productRepository.findAll();
        int totalDocs = products.size();

        if (totalDocs == 0) {
            log.warn("Không có sản phẩm nào trong CSDL để xây dựng TF-IDF");
            return;
        }

        // 1. Dựng tài liệu văn bản (document) và lấy danh sách từ khóa cho mỗi sản phẩm
        Map<String, List<String>> tokenizedDocuments = new HashMap<>();
        Map<String, Integer> docFrequency = new HashMap<>(); // df(t): số tài liệu chứa term t

        for (Product product : products) {
            productMemoryMap.put(product.getProductId(), product);
            
            String docText = buildProductDocumentText(product);
            List<String> tokens = tokenize(docText);
            tokenizedDocuments.put(product.getProductId(), tokens);

            // Đếm tần suất xuất hiện của các từ khóa trong các tài liệu (Document Frequency)
            Set<String> uniqueTokens = new HashSet<>(tokens);
            for (String token : uniqueTokens) {
                docFrequency.put(token, docFrequency.getOrDefault(token, 0) + 1);
            }
        }

        // 2. Tính toán chỉ số IDF cho mỗi từ khóa
        Map<String, Double> idfMap = new HashMap<>();
        for (Map.Entry<String, Integer> entry : docFrequency.entrySet()) {
            String term = entry.getKey();
            int df = entry.getValue();
            // Công thức IDF mượt tránh chia cho 0 và log âm
            double idf = Math.log(1.0 + ((double) totalDocs / (1.0 + df)));
            idfMap.put(term, idf);
        }

        // 3. Tính toán giá trị TF-IDF cho từng tài liệu sản phẩm
        for (Product product : products) {
            String pId = product.getProductId();
            List<String> tokens = tokenizedDocuments.get(pId);
            int totalTokensInDoc = tokens.size();

            if (totalTokensInDoc == 0) {
                tfIdfVectors.put(pId, new HashMap<>());
                continue;
            }

            // Đếm tần suất xuất hiện của từ khóa trong chính sản phẩm này
            Map<String, Integer> termCounts = new HashMap<>();
            for (String token : tokens) {
                termCounts.put(token, termCounts.getOrDefault(token, 0) + 1);
            }

            // Tính TF-IDF
            Map<String, Double> vector = new HashMap<>();
            for (Map.Entry<String, Integer> entry : termCounts.entrySet()) {
                String term = entry.getKey();
                int count = entry.getValue();
                
                double tf = (double) count / totalTokensInDoc;
                double idf = idfMap.getOrDefault(term, 0.0);
                double tfidf = tf * idf;
                
                vector.put(term, tfidf);
            }
            tfIdfVectors.put(pId, vector);
        }

        isMatrixBuilt = true;
        log.info("Xây dựng ma trận TF-IDF thành công cho {} sản phẩm.", totalDocs);
    }

    /**
     * Tạo chuỗi văn bản đại diện cho đặc tính của sản phẩm.
     */
    private String buildProductDocumentText(Product product) {
        StringBuilder sb = new StringBuilder();
        if (product.getProductName() != null) sb.append(product.getProductName()).append(" ");
        if (product.getDescription() != null) sb.append(product.getDescription()).append(" ");
        if (product.getColor() != null) sb.append(product.getColor()).append(" ");
        if (product.getMaterial() != null) sb.append(product.getMaterial()).append(" ");
        if (product.getCategory() != null && product.getCategory().getCategoryName() != null) {
            sb.append(product.getCategory().getCategoryName()).append(" ");
        }
        return sb.toString();
    }

    /**
     * Chuẩn hóa và tách từ (Tokenize) tiếng Việt đơn giản.
     */
    private List<String> tokenize(String text) {
        if (text == null || text.trim().isEmpty()) {
            return new ArrayList<>();
        }

        // Loại bỏ dấu tiếng Việt để matching tốt hơn
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "")
                .replaceAll("Đ", "D")
                .replaceAll("đ", "d");

        // Loại bỏ ký tự đặc biệt, đưa về viết thường
        normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", " ").toLowerCase();

        // Tách từ bằng khoảng trắng
        String[] words = normalized.split("\\s+");
        return Arrays.stream(words)
                .filter(w -> w.length() > 1) // Bỏ các từ quá ngắn như ký tự đơn
                .collect(Collectors.toList());
    }

    /**
     * Tính toán độ tương đồng Cosine giữa hai vector TF-IDF.
     */
    private double calculateCosineSimilarity(Map<String, Double> vectorA, Map<String, Double> vectorB) {
        if (vectorA == null || vectorB == null || vectorA.isEmpty() || vectorB.isEmpty()) {
            return 0.0;
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        // Tính tích vô hướng dotProduct(A, B) và độ dài vector A
        for (Map.Entry<String, Double> entry : vectorA.entrySet()) {
            String term = entry.getKey();
            double valA = entry.getValue();
            normA += valA * valA;

            if (vectorB.containsKey(term)) {
                dotProduct += valA * vectorB.get(term);
            }
        }

        // Tính độ dài vector B
        for (double valB : vectorB.values()) {
            normB += valB * valB;
        }

        if (normA == 0.0 || normB == 0.0) {
            return 0.0;
        }

        // cos(A, B) = A.B / (|A| * |B|)
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
