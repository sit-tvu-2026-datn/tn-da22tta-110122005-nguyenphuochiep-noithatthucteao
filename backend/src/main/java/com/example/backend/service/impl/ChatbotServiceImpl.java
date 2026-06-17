package com.example.backend.service.impl;

import com.example.backend.DTO.ChatRequest;
import com.example.backend.DTO.ChatResponse;
import com.example.backend.model.Category;
import com.example.backend.model.Product;
import com.example.backend.repository.CategoryRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ChatbotServiceImpl implements ChatbotService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.model}")
    private String model;

    @Value("${openai.api.url}")
    private String apiUrl;

    private final RestTemplate restTemplate;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    private final String FRONTEND_URL = "http://localhost:5173";

    // Số sản phẩm tối đa được đưa vào context gửi cho AI (sau khi pre-filter)
    private static final int MAX_PRODUCTS = 15;

    @Autowired
    public ChatbotServiceImpl(@Qualifier("chatbotRestTemplate") RestTemplate restTemplate,
            ProductRepository productRepository,
            CategoryRepository categoryRepository) {
        this.restTemplate = restTemplate;
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
    }

    @Override
    public ChatResponse getChatbotResponse(ChatRequest request) {
        try {
            // 1. Lấy dữ liệu kho hàng (Context) — đã PRE-FILTER theo nhu cầu của khách
            String productContext = getProductContextFromDB(request.getMessage(), request.getHistory());

            // 2. Headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey);

            // 3. Chuẩn bị Body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            List<Map<String, Object>> messages = new ArrayList<>();

            // === BƯỚC 1: SYSTEM PROMPT (LOGIC CHẶT CHẼ) ===
            String promptContent = "=== VAI TRÒ ===\n" +
                    "Bạn là CHUYÊN VIÊN TƯ VẤN NỘI THẤT của NPH Store.\n" +
                    "Bạn có nhiệm vụ tư vấn sản phẩm nội thất dựa trên dữ liệu kho hàng được cung cấp.\n" +
                    "Bạn phải luôn trả lời như một nhân viên tư vấn bán hàng chuyên nghiệp, thân thiện và tự nhiên.\n\n"
                    +

                    "=== PHẠM VI HỖ TRỢ ===\n" +
                    "- Nội thất phòng khách.\n" +
                    "- Nội thất phòng ngủ.\n" +
                    "- Nội thất phòng bếp.\n" +
                    "- Nội thất phòng làm việc.\n" +
                    "- Đồ trang trí, đèn, thảm, decor.\n" +
                    "- Tư vấn kích thước, chất liệu, màu sắc.\n" +
                    "- Tư vấn bố trí nội thất phù hợp không gian.\n\n" +

                    "=== CHỦ ĐỀ TỪ CHỐI ===\n" +
                    "Chỉ từ chối khi người dùng hỏi các chủ đề sau:\n" +
                    "- Lập trình, viết code, công nghệ thông tin.\n" +
                    "- Toán học, vật lý, hóa học.\n" +
                    "- Chính trị.\n" +
                    "- Tôn giáo.\n" +
                    "- Y tế, thuốc, chẩn đoán bệnh.\n" +
                    "- Pháp luật.\n" +
                    "- Các nội dung không liên quan đến nội thất hoặc mua sắm nội thất.\n\n" +

                    "Nếu gặp chủ đề bị cấm, trả lời chính xác:\n" +
                    "\"Dạ em chỉ là nhân viên tư vấn nội thất nên không hỗ trợ được nội dung này ạ. Mình quay lại chọn nội thất cho ngôi nhà của mình nhé!\"\n\n"
                    +

                    "=== DỮ LIỆU KHO HÀNG ===\n" +
                    "Chỉ được sử dụng dữ liệu bên dưới.\n" +
                    "Không được tự tạo sản phẩm mới.\n" +
                    "Không được tự tạo giá tiền.\n" +
                    "Không được tự tạo kích thước.\n" +
                    "Không được tự tạo link sản phẩm.\n" +
                    "Không được tự tạo hình ảnh.\n\n" +

                    "--- KHO HÀNG BẮT ĐẦU ---\n" +
                    productContext + "\n" +
                    "--- KHO HÀNG KẾT THÚC ---\n\n" +

                    "=== TRẢ LỜI CÂU HỎI VỀ THÔNG SỐ / CHI TIẾT SẢN PHẨM ===\n" +
                    "Mỗi sản phẩm trong kho có trường 'Thông số' gồm: Kích thước (Dài x Rộng x Cao, đơn vị cm), Cân nặng, Màu sắc, Chất liệu, Bảo hành, Xuất xứ.\n" +
                    "- Khi khách hỏi về thông số/chi tiết (vd: 'dài rộng cao bao nhiêu', 'kích thước thế nào', 'chất liệu gì', 'nặng bao nhiêu', 'bảo hành mấy năm', 'màu gì', 'xuất xứ ở đâu'): PHẢI trả lời TRỰC TIẾP và ĐÚNG TRỌNG TÂM đúng thông số được hỏi, lấy số liệu từ trường 'Thông số' của chính sản phẩm đó.\n" +
                    "- Nếu khách hỏi 'dài rộng cao' thì nêu rõ từng chiều: Dài ... cm, Rộng ... cm, Cao ... cm. KHÔNG trả lời lan man sang giá hoặc sản phẩm khác trừ khi khách hỏi.\n" +
                    "- Xác định đúng sản phẩm khách đang hỏi: dựa vào tên sản phẩm trong câu hỏi, hoặc sản phẩm vừa được nhắc tới gần nhất trong lịch sử trò chuyện.\n" +
                    "- TUYỆT ĐỐI KHÔNG bịa thông số. Nếu trường 'Thông số' ghi 'Chưa cập nhật' hoặc thiếu đúng chỉ số khách hỏi: trả lời trung thực rằng shop chưa cập nhật thông số đó và mời khách để lại liên hệ để được hỗ trợ, KHÔNG tự nghĩ ra con số.\n" +
                    "- Với câu hỏi thuần về thông số, trả lời ngắn gọn đúng trọng tâm; có thể kèm thẻ sản phẩm nhưng KHÔNG bắt buộc trình bày theo mẫu danh sách đề xuất.\n\n" +

                    "=== PHÂN TÍCH YÊU CẦU KHÁCH HÀNG ===\n" +
                    "Trước khi trả lời, hãy xác định:\n" +
                    "1. Loại phòng.\n" +
                    "2. Diện tích phòng (nếu có).\n" +
                    "3. Ngân sách (nếu có).\n" +
                    "4. Phong cách (nếu có).\n" +
                    "5. Màu sắc yêu thích (nếu có).\n" +
                    "6. Nhu cầu đặc biệt (nếu có).\n\n" +

                    "Ví dụ:\n" +
                    "Khách hỏi: 'Tư vấn phòng ngủ 10m2 khoảng 10 triệu'\n" +
                    "=> Loại phòng: Phòng ngủ\n" +
                    "=> Diện tích: 10m2\n" +
                    "=> Ngân sách: 10 triệu\n\n" +

                    "Khách hỏi: 'Phòng khách hiện đại khoảng 20 triệu'\n" +
                    "=> Loại phòng: Phòng khách\n" +
                    "=> Phong cách: Hiện đại\n" +
                    "=> Ngân sách: 20 triệu\n\n" +

                    "=== SUY LUẬN NHÓM SẢN PHẨM ===\n" +
                    "Nếu khách hỏi về phòng khách:\n" +
                    "- Ưu tiên Sofa.\n" +
                    "- Bàn trà.\n" +
                    "- Kệ TV.\n" +
                    "- Đèn trang trí.\n\n" +

                    "Nếu khách hỏi về phòng ngủ:\n" +
                    "- Ưu tiên Giường ngủ.\n" +
                    "- Tab đầu giường.\n" +
                    "- Tủ quần áo.\n" +
                    "- Đèn ngủ.\n\n" +

                    "Nếu khách hỏi về phòng bếp:\n" +
                    "- Bàn ăn.\n" +
                    "- Ghế ăn.\n" +
                    "- Tủ bếp.\n\n" +

                    "Nếu khách hỏi về phòng làm việc:\n" +
                    "- Bàn làm việc.\n" +
                    "- Ghế làm việc.\n" +
                    "- Kệ sách.\n\n" +

                    "=== QUY TẮC DIỆN TÍCH ===\n" +
                    "Nếu khách cung cấp diện tích:\n\n" +

                    "- Dưới 12m2:\n" +
                    "  + Ưu tiên sản phẩm nhỏ gọn.\n" +
                    "  + Tránh sản phẩm quá lớn.\n\n" +

                    "- Từ 12m2 đến 20m2:\n" +
                    "  + Ưu tiên sản phẩm kích thước tiêu chuẩn.\n\n" +

                    "- Trên 20m2:\n" +
                    "  + Có thể chọn sản phẩm lớn hơn.\n\n" +

                    "Nếu dữ liệu sản phẩm có chiều dài, chiều rộng hoặc chiều cao:\n" +
                    "Hãy ưu tiên sản phẩm phù hợp diện tích phòng.\n\n" +

                    "=== QUY TẮC NGÂN SÁCH ===\n" +
                    "Nếu khách cung cấp ngân sách:\n" +
                    "- Với các sản phẩm THAY THẾ nhau (cùng danh mục): GIÁ CỦA TỪNG sản phẩm phải nhỏ hơn hoặc bằng ngân sách. TUYỆT ĐỐI KHÔNG cộng dồn giá các sản phẩm thay thế rồi đem so với ngân sách.\n" +
                    "- Chỉ khi khách yêu cầu COMBO/trọn bộ gồm nhiều món KHÁC danh mục: khi đó TỔNG giá các món trong combo mới phải nhỏ hơn hoặc bằng ngân sách.\n" +
                    "- Ưu tiên sản phẩm có tỷ lệ giá/chất lượng tốt.\n" +
                    "- Nếu ngân sách thấp, ưu tiên các món nội thất quan trọng trước.\n" +
                    "- Không được đề xuất sản phẩm vượt quá ngân sách nếu còn lựa chọn phù hợp khác.\n\n" +

                    "=== QUY TẮC LỌC SẢN PHẨM ===\n" +
                    "- Chỉ sử dụng sản phẩm có trong kho hàng.\n" +
                    "- Không được bịa sản phẩm.\n" +
                    "- Không được bịa giá.\n" +
                    "- Không được bịa thông tin tồn kho.\n" +
                    "- Ưu tiên sản phẩm còn hàng.\n" +
                    "- Ưu tiên sản phẩm phù hợp diện tích.\n" +
                    "- Ưu tiên sản phẩm phù hợp ngân sách.\n\n" +

                    "=== KHI KHÔNG TÌM THẤY ===\n" +
                    "Nếu kho hàng không có sản phẩm phù hợp:\n" +
                    "- Trả lời trung thực.\n" +
                    "- Gợi ý danh mục gần nhất nếu có.\n" +
                    "- Không dùng câu từ chối dành cho chủ đề cấm.\n\n" +

                    "Ví dụ:\n" +
                    "'Hiện tại shop chưa có mẫu giường ngủ phù hợp ngân sách này ạ. Anh/chị có thể tham khảo các mẫu tab đầu giường hoặc tăng thêm ngân sách để có nhiều lựa chọn hơn.'\n\n"
                    +

                    "=== QUY TẮC GIAO TIẾP ===\n" +
                    "- Luôn xưng hô: em.\n" +
                    "- Gọi khách là: anh/chị.\n" +
                    "- Thân thiện, lịch sự.\n" +
                    "- Nếu khách phàn nàn hoặc không hài lòng, phải xin lỗi trước.\n\n" +

                    "=== PHÂN BIỆT SẢN PHẨM THAY THẾ & BỔ SUNG (RẤT QUAN TRỌNG) ===\n" +
                    "Mỗi sản phẩm trong kho đều có trường 'Danh mục'. BẮT BUỘC dựa vào danh mục để phân loại:\n" +
                    "- SẢN PHẨM THAY THẾ (alternative): các sản phẩm CÙNG một danh mục chính (vd: nhiều mẫu Sofa, nhiều mẫu Giường, nhiều Tivi, nhiều Tủ lạnh). Đây là các LỰA CHỌN khác nhau cho CÙNG một nhu cầu — khách thường chỉ mua MỘT trong số đó.\n" +
                    "- SẢN PHẨM BỔ SUNG (complementary): các sản phẩm thuộc các danh mục KHÁC NHAU nhưng dùng chung trong một không gian (vd: Sofa + Bàn trà + Đèn + Thảm). Đây là các món có thể mua KÈM nhau.\n\n" +

                    "NGUYÊN TẮC BẮT BUỘC:\n" +
                    "- TUYỆT ĐỐI KHÔNG cộng giá của các sản phẩm THAY THẾ (cùng danh mục) với nhau.\n" +
                    "- TUYỆT ĐỐI KHÔNG tạo 'Tổng chi phí dự kiến' từ các sản phẩm thay thế.\n" +
                    "- KHÔNG dùng từ ngữ khiến khách hiểu rằng nên mua tất cả các sản phẩm thay thế cùng lúc.\n" +
                    "- Khi có nhiều sản phẩm cùng phù hợp: chọn 1 sản phẩm TỐT NHẤT làm khuyến nghị chính, các sản phẩm còn lại là 'lựa chọn thay thế', và nêu ngắn gọn ưu/nhược của từng lựa chọn.\n\n" +

                    "=== ĐỊNH DẠNG KẾT QUẢ ===\n" +
                    "Trước khi viết, hãy ĐẾM số danh mục khác nhau trong những sản phẩm em chọn để hiển thị, rồi chọn 1 trong 2 mẫu sau:\n\n" +

                    "--- MẪU A: các sản phẩm CÙNG một danh mục (lựa chọn thay thế) ---\n" +
                    "Mở đầu: 'Dạ với nhu cầu của anh/chị, em xin gợi ý các lựa chọn phù hợp:'\n" +
                    "Liệt kê từng sản phẩm (KHÔNG trình bày như một bộ phải mua chung), chỉ rõ đâu là lựa chọn em đề xuất nhất:\n" +
                    "[Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n" +
                    "Ưu điểm: ... | Phù hợp với: ...\n" +
                    "[Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n" +
                    "Ưu điểm: ... | Phù hợp với: ...\n" +
                    "Kết thúc bằng dòng: 'Các lựa chọn phù hợp cho anh/chị tham khảo ạ.'\n" +
                    "=> Ở MẪU A: TUYỆT ĐỐI KHÔNG ghi 'Tổng chi phí dự kiến' và KHÔNG cộng giá.\n\n" +

                    "--- MẪU B: các sản phẩm thuộc NHIỀU danh mục bổ sung nhau (combo/trọn bộ) HOẶC khách yêu cầu combo ---\n" +
                    "Mở đầu: 'Dạ em xin đề xuất bộ sản phẩm cho không gian của anh/chị:'\n" +
                    "[Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n" +
                    "[Tên Sản Phẩm](Link) ![GiáGốc|GiáGiảm](LinkẢnh)\n" +
                    "Khi đó MỚI được ghi: 'Tổng chi phí dự kiến: XXX VNĐ' (chỉ cộng giá các món KHÁC danh mục trong combo).\n\n" +

                    "Sau cùng, nêu 'Lý do lựa chọn' ngắn gọn (phù hợp diện tích / ngân sách / nhu cầu).\n\n" +

                    "=== QUY TẮC HIỂN THỊ ===\n" +
                    "- Chỉ hiển thị tối đa 3 sản phẩm.\n" +
                    "- Chỉ hiển thị sản phẩm đã lọc, có trong kho.\n" +
                    "- Không viết mô tả dài cho từng sản phẩm.\n" +
                    "- Giá trong ![] chỉ được là số nguyên, không thêm ký tự tiền tệ.\n" +
                    "- CHỈ hiển thị 'Tổng chi phí dự kiến' khi áp dụng MẪU B (nhiều món KHÁC danh mục/combo, hoặc khách yêu cầu combo).\n" +
                    "- Nếu tất cả sản phẩm hiển thị thuộc CÙNG một danh mục: KHÔNG tính tổng, KHÔNG dùng cụm từ 'Tổng chi phí dự kiến', thay bằng 'Các lựa chọn phù hợp'.\n";
                    
            // Add System Prompt
            messages.add(Map.of("role", "system", "content", promptContent));

            if (request.getHistory() != null && !request.getHistory().isEmpty()) {
                // Ép kiểu về Map<String, Object> để tương thích với List messages
                for (Map<String, String> histMsg : request.getHistory()) {
                    messages.add(new HashMap<>(histMsg));
                }
            }

            // === BƯỚC 3: CÂU HỎI MỚI CỦA USER (LUÔN CUỐI CÙNG) ===
            messages.add(Map.of("role", "user", "content", request.getMessage()));

            requestBody.put("messages", messages);

            // 4. Call API
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) messageObj.get("content");

            return new ChatResponse(content);

        } catch (Exception e) {
            e.printStackTrace();
            return new ChatResponse("Hệ thống đang bảo trì, vui lòng thử lại sau.");
        }
    }

    private String getProductContextFromDB(String userMessage, List<Map<String, String>> history) {
        // Chỉ lấy sản phẩm còn hàng (quantity > 0) thay vì findAll()
        List<Product> products = productRepository.findProductsForChatbot();
        if (products.isEmpty())
            return "Kho đang cập nhật.";

        // === PRE-FILTER: chỉ giữ lại sản phẩm liên quan tới nhu cầu của khách ===
        String searchText = buildSearchText(userMessage, history);
        List<Product> relevant = filterRelevantProducts(searchText, products);

        // Map categoryId -> tên danh mục (gốc) để gắn vào context. Nhờ đó AI phân biệt được
        // sản phẩm THAY THẾ (cùng danh mục) với sản phẩm BỔ SUNG (khác danh mục) và không
        // cộng nhầm giá các lựa chọn thay thế thành một "tổng chi phí".
        Map<String, String> categoryDisplayNames = new HashMap<>();
        for (Category c : categoryRepository.findAll()) {
            if (c.getCategoryId() != null) {
                categoryDisplayNames.put(c.getCategoryId(), safe(c.getCategoryName()));
            }
        }

        // !!! QUAN TRỌNG: Thay đổi domain này thành domain thật của server chứa ảnh
        String IMAGE_BASE_URL = "http://localhost:8080";

        return relevant.stream()
                .map(p -> {
                    String productLink = FRONTEND_URL + "/product/" + p.getProductId();

                    // Xử lý ảnh (Tạo link tuyệt đối)
                    String rawImg = p.getImages() != null && !p.getImages().isEmpty() ? p.getImages().get(0).getUrl()
                            : null;
                    String finalImgUrl;
                    if (rawImg == null || rawImg.isEmpty()) {
                        finalImgUrl = "https://via.placeholder.com/300x200.png?text=No+Image";
                    } else if (rawImg.startsWith("http")) {
                        finalImgUrl = rawImg;
                    } else {
                        // Đảm bảo không bị trùng dấu gạch chéo
                        String path = rawImg.startsWith("/") ? rawImg : "/" + rawImg;
                        finalImgUrl = IMAGE_BASE_URL + path;
                    }

                    // Xử lý Giá & Giảm giá
                    BigDecimal currentPrice = p.getPrice(); // Giá bán hiện tại
                    BigDecimal originalPrice = currentPrice;
                    BigDecimal discountVal = p.getDiscount(); // Ví dụ: 15.00

                    // Tính giá gốc nếu có discount
                    if (discountVal != null && discountVal.compareTo(BigDecimal.ZERO) > 0) {
                        BigDecimal factor = BigDecimal.valueOf(100).subtract(discountVal);
                        if (factor.compareTo(BigDecimal.ZERO) > 0) {
                            originalPrice = currentPrice.multiply(BigDecimal.valueOf(100))
                                    .divide(factor, 0, RoundingMode.HALF_UP);
                        }
                    }

                    String priceTxt = String.format("%.0f", currentPrice);
                    String originalPriceTxt = String.format("%.0f", originalPrice);

                    int quantity = p.getQuantity();
                    String status = (quantity > 0) ? "CÒN HÀNG" : "HẾT HÀNG";

                    String categoryName = p.getCategoryId() != null
                            ? categoryDisplayNames.getOrDefault(p.getCategoryId(), "Khác")
                            : "Khác";

                    // Data gửi cho AI
                    return String.format(
                            "- Tên: %s | Danh mục: %s | Trạng thái: %s | Giá Gốc: %s | Giá Giảm: %s | Thông số: %s | Link: %s | Ảnh: %s | Mô tả: %s",
                            p.getProductName(),
                            categoryName,
                            status,
                            originalPriceTxt,
                            priceTxt,
                            buildProductSpecs(p),
                            productLink,
                            finalImgUrl,
                            truncate(p.getDescription(), 150));
                })
                .collect(Collectors.joining("\n"));
    }

    // ====================================================================
    // ===================  PRE-FILTER SẢN PHẨM  ==========================
    // ====================================================================

    /**
     * Ghép câu hỏi hiện tại với vài câu hỏi gần nhất của khách (trong history)
     * để giữ ngữ cảnh cho các câu hỏi nối tiếp (vd: "rẻ hơn không?", "mẫu khác đi").
     * Câu hỏi hiện tại đặt đầu chuỗi để có trọng số cao nhất khi tách token.
     */
    private String buildSearchText(String userMessage, List<Map<String, String>> history) {
        StringBuilder sb = new StringBuilder(userMessage == null ? "" : userMessage);
        if (history != null && !history.isEmpty()) {
            int count = 0;
            for (int i = history.size() - 1; i >= 0 && count < 3; i--) {
                Map<String, String> h = history.get(i);
                if (h != null && "user".equals(h.get("role")) && h.get("content") != null) {
                    sb.append(" ").append(h.get("content"));
                    count++;
                }
            }
        }
        return sb.toString();
    }

    /**
     * Lọc và xếp hạng sản phẩm theo độ liên quan với nhu cầu khách hàng.
     * Match trên: tên sản phẩm, tên danh mục, chất liệu, màu sắc, mô tả.
     * Có mở rộng theo loại phòng và lọc theo ngân sách.
     */
    private List<Product> filterRelevantProducts(String searchText, List<Product> products) {
        String norm = normalize(searchText);

        // 1. Ngân sách (giá tối đa) nếu khách có nhắc tới
        BigDecimal budget = extractBudget(norm);

        // 2. Tập từ khóa: token có nghĩa từ câu hỏi + từ khóa mở rộng theo loại phòng
        Set<String> tokens = extractTokens(norm);
        Set<String> roomKeywords = expandRoomKeywords(norm, searchText.toLowerCase());

        // 3. Map categoryId -> tên danh mục (đã chuẩn hóa) để match từ khóa danh mục
        Map<String, String> categoryNames = new HashMap<>();
        for (Category c : categoryRepository.findAll()) {
            if (c.getCategoryId() != null) {
                categoryNames.put(c.getCategoryId(), normalize(c.getCategoryName()));
            }
        }

        // 4. Chấm điểm từng sản phẩm
        List<ScoredProduct> scored = new ArrayList<>();
        for (Product p : products) {
            // Loại sản phẩm vượt ngân sách (cho phép sai số 20%)
            if (budget != null && p.getPrice() != null
                    && p.getPrice().compareTo(budget.multiply(BigDecimal.valueOf(1.2))) > 0) {
                continue;
            }

            String haystackName = normalize(p.getProductName());
            String catName = p.getCategoryId() != null ? categoryNames.getOrDefault(p.getCategoryId(), "") : "";
            String haystackOther = normalize(
                    (catName + " " + safe(p.getMaterial()) + " " + safe(p.getColor()) + " " + safe(p.getDescription())));

            int score = 0;
            // Từ khóa loại phòng (trọng số cao)
            for (String kw : roomKeywords) {
                if (haystackName.contains(kw))
                    score += 5;
                else if (haystackOther.contains(kw))
                    score += 3;
            }
            // Token từ câu hỏi
            for (String t : tokens) {
                if (haystackName.contains(t))
                    score += 4;
                else if (haystackOther.contains(t))
                    score += 1;
            }
            // Thưởng điểm nếu nằm trong ngân sách
            if (budget != null && p.getPrice() != null && p.getPrice().compareTo(budget) <= 0) {
                score += 2;
            }

            scored.add(new ScoredProduct(p, score));
        }

        // 5. Nếu không có sản phẩm nào khớp từ khóa (câu hỏi chung chung) -> fallback:
        //    trả về danh sách (đã lọc ngân sách), ưu tiên giá thấp.
        boolean anyMatch = scored.stream().anyMatch(s -> s.score > 0);

        Comparator<ScoredProduct> cmp = anyMatch
                ? Comparator.comparingInt((ScoredProduct s) -> s.score).reversed()
                        .thenComparing(s -> nullToMax(s.product.getPrice()))
                : Comparator.comparing(s -> nullToMax(s.product.getPrice()));

        return scored.stream()
                .sorted(cmp)
                .limit(MAX_PRODUCTS)
                .map(s -> s.product)
                .collect(Collectors.toList());
    }

    /** Bỏ dấu tiếng Việt, đưa về chữ thường để so khớp ổn định. */
    private String normalize(String s) {
        if (s == null)
            return "";
        String lower = s.toLowerCase();
        String temp = Normalizer.normalize(lower, Normalizer.Form.NFD);
        temp = temp.replaceAll("\\p{M}+", "");
        return temp.replace("đ", "d");
    }

    private static final Set<String> STOPWORDS = new java.util.HashSet<>(Arrays.asList(
            "tim", "kiem", "can", "muon", "mua", "cho", "toi", "minh", "co", "khong", "gia",
            "khoang", "voi", "va", "hay", "la", "duoi", "tren", "phong", "met", "vuong",
            "ngan", "nghin", "trieu", "ty", "tr", "cai", "chiec", "nhu", "nao", "gi", "ve",
            "them", "mot", "hai", "ba", "bon", "nam", "loai", "mau", "sac", "kich", "thuoc",
            "size", "dang", "hien", "tai", "giup", "em", "anh", "chi", "shop", "noi", "that"));

    /** Tách câu hỏi thành các token có nghĩa (bỏ stopword, số thuần, token quá ngắn). */
    private Set<String> extractTokens(String norm) {
        Set<String> tokens = new LinkedHashSet<>();
        for (String raw : norm.split("[^a-z0-9]+")) {
            if (raw.length() < 2)
                continue;
            if (raw.matches("\\d+"))
                continue;
            if (STOPWORDS.contains(raw))
                continue;
            tokens.add(raw);
        }
        return tokens;
    }

    /**
     * Mở rộng từ khóa theo loại phòng mà khách nhắc tới.
     * Dùng {@code raw} (chuỗi còn dấu, đã lowercase) để phân biệt "tư vấn" với "văn phòng"
     * — vì khi bỏ dấu, "tư vấn" -> "tu van" rất dễ trùng "văn phòng" -> "van phong".
     */
    private Set<String> expandRoomKeywords(String norm, String raw) {
        Set<String> kws = new LinkedHashSet<>();
        if (norm.contains("phong khach") || norm.contains("khach")) {
            kws.addAll(Arrays.asList("sofa", "ban tra", "ke tv", "ke ti vi", "tham", "den"));
        }
        if (norm.contains("phong ngu") || raw.contains("ngủ")) {
            kws.addAll(Arrays.asList("giuong", "nem", "dem", "tab dau giuong", "tu quan ao", "ban trang diem"));
        }
        if (norm.contains("bep") || norm.contains("an uong") || norm.contains("nha bep")) {
            kws.addAll(Arrays.asList("ban an", "ghe an", "tu bep", "ke bep"));
        }
        // Chỉ kích hoạt "phòng làm việc" khi khách thực sự nhắc tới — dựa trên chuỗi CÒN DẤU
        if (raw.contains("làm việc") || raw.contains("văn phòng") || raw.contains("học")) {
            kws.addAll(Arrays.asList("ban lam viec", "ban hoc", "ghe", "ke sach", "tu sach"));
        }
        return kws;
    }

    /** Trích ngân sách (giá tối đa, đơn vị VNĐ) từ câu hỏi đã chuẩn hóa. */
    private BigDecimal extractBudget(String norm) {
        // Bắt: số (có thể kèm dấu , hoặc .) + đơn vị: ty / trieu / tr / nghin / ngan / k
        Matcher m = Pattern.compile("(\\d+(?:[.,]\\d+)?)\\s*(ty|trieu|tr|nghin|ngan|k)\\b").matcher(norm);
        if (m.find()) {
            double value = Double.parseDouble(m.group(1).replace(",", "."));
            String unit = m.group(2);
            double multiplier;
            switch (unit) {
                case "ty":
                    multiplier = 1_000_000_000d;
                    break;
                case "trieu":
                case "tr":
                    multiplier = 1_000_000d;
                    break;
                default: // nghin / ngan / k
                    multiplier = 1_000d;
                    break;
            }
            return BigDecimal.valueOf(value * multiplier);
        }
        return null;
    }

    private String truncate(String s, int max) {
        if (s == null)
            return "";
        s = s.replaceAll("\\s+", " ").trim();
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    /**
     * Gom các thông số kỹ thuật của sản phẩm thành một chuỗi ngắn gọn để đưa vào context,
     * giúp chatbot trả lời được câu hỏi về chi tiết sản phẩm (dài/rộng/cao, chất liệu, màu...).
     * Chỉ thêm trường có dữ liệu. Đơn vị tuân theo quy ước hiển thị ở frontend:
     * kích thước Dài x Rộng x Cao tính bằng cm; cân nặng lưu bằng gram (>= 1000 đổi sang kg).
     */
    private String buildProductSpecs(Product p) {
        List<String> parts = new ArrayList<>();

        // Kích thước: ưu tiên Dài x Rộng x Cao (cm); nếu thiếu thì dùng trường size dạng text
        if (p.getLength() != null && p.getWidth() != null && p.getHeight() != null) {
            parts.add(String.format("Kích thước (Dài x Rộng x Cao): %d x %d x %d cm",
                    p.getLength(), p.getWidth(), p.getHeight()));
        } else {
            if (p.getLength() != null)
                parts.add("Chiều dài: " + p.getLength() + " cm");
            if (p.getWidth() != null)
                parts.add("Chiều rộng: " + p.getWidth() + " cm");
            if (p.getHeight() != null)
                parts.add("Chiều cao: " + p.getHeight() + " cm");
            if (p.getLength() == null && p.getWidth() == null && p.getHeight() == null
                    && p.getSize() != null && !p.getSize().isBlank())
                parts.add("Kích thước: " + p.getSize().trim());
        }

        // Cân nặng: DB lưu bằng gram
        if (p.getWeight() != null && p.getWeight() > 0) {
            if (p.getWeight() >= 1000) {
                double kg = p.getWeight() / 1000.0;
                String kgStr = (kg == Math.floor(kg)) ? String.valueOf((long) kg) : String.format("%.1f", kg);
                parts.add("Cân nặng: " + kgStr + " kg");
            } else {
                parts.add("Cân nặng: " + p.getWeight() + " g");
            }
        }

        if (p.getColor() != null && !p.getColor().isBlank())
            parts.add("Màu sắc: " + p.getColor().trim());
        if (p.getMaterial() != null && !p.getMaterial().isBlank())
            parts.add("Chất liệu: " + p.getMaterial().trim());
        if (p.getWarranty() != null && !p.getWarranty().isBlank())
            parts.add("Bảo hành: " + p.getWarranty().trim());
        if (p.getOrigin() != null && !p.getOrigin().isBlank())
            parts.add("Xuất xứ: " + p.getOrigin().trim());

        return parts.isEmpty() ? "Chưa cập nhật" : String.join("; ", parts);
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private BigDecimal nullToMax(BigDecimal price) {
        return price == null ? BigDecimal.valueOf(Long.MAX_VALUE) : price;
    }

    /** Sản phẩm kèm điểm liên quan, dùng nội bộ khi xếp hạng. */
    private static class ScoredProduct {
        final Product product;
        final int score;

        ScoredProduct(Product product, int score) {
            this.product = product;
            this.score = score;
        }
    }
}