package com.example.backend.service.impl;

import com.example.backend.DTO.ChatProductDTO;
import com.example.backend.DTO.ChatRequest;
import com.example.backend.DTO.ChatResponse;
import com.example.backend.DTO.ChatSpecDTO;
import com.example.backend.model.Category;
import com.example.backend.model.Product;
import com.example.backend.repository.CategoryRepository;
import com.example.backend.repository.ProductRepository;
import com.example.backend.service.ChatbotService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    /**
     * Bật JSON mode của API AI (response_format = json_object). Mặc định true.
     * Nếu nhà cung cấp AI không hỗ trợ tham số này, đặt openai.json-mode.enabled=false
     * trong .env — prompt vẫn yêu cầu AI trả JSON nên parser phía dưới vẫn hoạt động.
     */
    @Value("${openai.json-mode.enabled:true}")
    private boolean jsonModeEnabled;

    private final RestTemplate restTemplate;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Base URL của server chứa ảnh (đổi thành domain thật khi deploy)
    private static final String IMAGE_BASE_URL = "http://localhost:8080";

    // Số sản phẩm tối đa đưa vào context gửi cho AI (sau khi pre-filter)
    private static final int MAX_PRODUCTS = 15;

    // Số sản phẩm tối đa hiển thị trên 1 câu trả lời
    private static final int MAX_RECOMMENDATIONS = 3;

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
            // 0. THAM CHIẾU THEO NGỮ CẢNH: nếu khách nhắc tới sản phẩm theo số thứ tự
            //    ("sản phẩm số 2", "mẫu thứ 3"...) -> trả chi tiết NGAY, không cần gọi AI.
            ChatResponse ordinalResponse = tryResolveOrdinalReference(request);
            if (ordinalResponse != null) {
                return ordinalResponse;
            }

            // 1. Lấy sản phẩm còn hàng + pre-filter theo nhu cầu khách
            List<Product> inStock = productRepository.findProductsForChatbot();
            Map<String, String> categoryNames = loadCategoryDisplayNames();

            String searchText = buildSearchText(request.getMessage(), request.getHistory());
            List<Product> relevant = inStock.isEmpty()
                    ? new ArrayList<>()
                    : filterRelevantProducts(searchText, inStock);

            // Map id -> Product để HYDRATE. Chỉ id nằm trong danh sách đã cấp cho AI mới
            // được dựng thẻ -> chặn AI bịa id hoặc đề xuất sản phẩm ngoài kho.
            Map<String, Product> byId = new LinkedHashMap<>();
            for (Product p : relevant) {
                byId.put(p.getProductId(), p);
            }

            // 2. Build context (kèm ID, KHÔNG kèm link/ảnh — backend tự dựng các trường này)
            String productContext = buildProductContext(relevant, categoryNames);

            // 3. Gọi AI -> nhận chuỗi JSON
            String aiContent = callAi(request, productContext);

            // 4. Parse JSON của AI rồi hydrate dữ liệu sản phẩm thật từ DB
            return buildResponseFromAi(aiContent, byId, categoryNames);

        } catch (Exception e) {
            e.printStackTrace();
            return ChatResponse.text("Hệ thống đang bảo trì, vui lòng thử lại sau.");
        }
    }

    // ====================================================================
    // ============== GỌI AI & DỰNG PROMPT (TRẢ VỀ JSON) ==================
    // ====================================================================

    @SuppressWarnings("unchecked")
    private String callAi(ChatRequest request, String productContext) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        if (jsonModeEnabled) {
            // Ép AI trả về JSON object hợp lệ (OpenAI-compatible)
            requestBody.put("response_format", Map.of("type", "json_object"));
        }

        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", buildSystemPrompt(productContext)));

        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            for (Map<String, String> histMsg : request.getHistory()) {
                messages.add(new HashMap<>(histMsg));
            }
        }
        messages.add(Map.of("role", "user", "content", safe(request.getMessage())));
        requestBody.put("messages", messages);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(apiUrl, entity, Map.class);

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) {
            return "";
        }
        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        if (choices == null || choices.isEmpty()) {
            return "";
        }
        Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
        if (messageObj == null) {
            return "";
        }
        Object content = messageObj.get("content");
        return content == null ? "" : content.toString();
    }

    private String buildSystemPrompt(String productContext) {
        return "=== VAI TRÒ ===\n" +
                "Bạn là CHUYÊN VIÊN TƯ VẤN NỘI THẤT của NPH Store, thân thiện và chuyên nghiệp.\n" +
                "Nhiệm vụ: tư vấn nội thất dựa trên DỮ LIỆU KHO HÀNG được cấp, và LUÔN trả về kết quả dưới dạng JSON đúng định dạng quy định bên dưới.\n\n"
                +

                "=== PHẠM VI HỖ TRỢ ===\n" +
                "- Nội thất phòng khách, phòng ngủ, phòng bếp, phòng làm việc.\n" +
                "- Đồ trang trí, đèn, thảm, decor.\n" +
                "- Tư vấn kích thước, chất liệu, màu sắc, bố trí không gian.\n\n" +

                "=== CHỦ ĐỀ TỪ CHỐI ===\n" +
                "Chỉ từ chối khi khách hỏi: lập trình/CNTT, toán-lý-hóa, chính trị, tôn giáo, y tế/thuốc, pháp luật, hoặc nội dung không liên quan nội thất.\n"
                +
                "Khi gặp chủ đề bị cấm, trả về type \"text\" với message đúng nguyên văn:\n" +
                "\"Dạ em chỉ là nhân viên tư vấn nội thất nên không hỗ trợ được nội dung này ạ. Mình quay lại chọn nội thất cho ngôi nhà của mình nhé!\"\n\n"
                +

                "=== DỮ LIỆU KHO HÀNG ===\n" +
                "Chỉ được dùng dữ liệu bên dưới. KHÔNG tự tạo sản phẩm, giá, kích thước, hình ảnh hay đường link.\n" +
                "Mỗi dòng có trường 'ID' là mã sản phẩm — dùng CHÍNH XÁC mã này khi đề xuất.\n" +
                "--- KHO HÀNG BẮT ĐẦU ---\n" +
                productContext + "\n" +
                "--- KHO HÀNG KẾT THÚC ---\n\n" +

                "=== ĐỊNH DẠNG TRẢ VỀ (BẮT BUỘC) ===\n" +
                "Bạn PHẢI trả về DUY NHẤT một object JSON hợp lệ, KHÔNG kèm bất kỳ chữ nào khác, KHÔNG bọc trong dấu ```.\n" +
                "Cấu trúc JSON:\n" +
                "{\n" +
                "  \"type\": \"text\" | \"product_recommendation\",\n" +
                "  \"message\": \"lời tư vấn thân thiện cho khách\",\n" +
                "  \"products\": [ { \"id\": \"MÃ_SẢN_PHẨM\", \"highlights\": [\"ý ngắn 1\", \"ý ngắn 2\"] } ]\n" +
                "}\n\n" +

                "QUY TẮC JSON:\n" +
                "- Dùng \"type\": \"product_recommendation\" khi muốn giới thiệu sản phẩm cụ thể từ kho; ngược lại dùng \"type\": \"text\".\n"
                +
                "- Với \"type\": \"text\": bỏ trường \"products\" hoặc để mảng rỗng [].\n" +
                "- \"message\": văn bản THUẦN, thân thiện. TUYỆT ĐỐI KHÔNG chứa: URL/link, giá tiền, markdown, HTML, hình ảnh, hay danh sách tên sản phẩm kèm giá. KHÔNG liệt kê giá hay đường dẫn — giao diện sẽ tự hiển thị thẻ sản phẩm.\n"
                +
                "- \"id\": copy CHÍNH XÁC từ trường 'ID' trong kho hàng. KHÔNG bịa id, KHÔNG dùng sản phẩm ngoài kho.\n" +
                "- \"highlights\": 2-4 ý RẤT ngắn (mỗi ý dưới 8 từ) nêu ưu điểm/độ phù hợp. KHÔNG chứa giá, link, HTML, markdown.\n" +
                "- Tối đa " + MAX_RECOMMENDATIONS + " sản phẩm trong \"products\".\n\n" +

                "=== KHI NÀO DÙNG product_recommendation / text ===\n" +
                "- product_recommendation: khi khách cần tìm/mua/gợi ý sản phẩm VÀ kho có món phù hợp.\n" +
                "- text: chào hỏi; trả lời câu hỏi thông số/chi tiết của một sản phẩm; từ chối chủ đề cấm; hoặc khi kho KHÔNG có sản phẩm phù hợp (nói trung thực trong message).\n\n"
                +

                "=== PHÂN TÍCH NHU CẦU ===\n" +
                "Xác định (nếu khách nêu): loại phòng, diện tích, ngân sách, phong cách, màu sắc, nhu cầu đặc biệt — để chọn đúng sản phẩm.\n\n"
                +

                "=== GỢI Ý THEO PHÒNG ===\n" +
                "- Phòng khách: Sofa, bàn trà, kệ TV, đèn trang trí.\n" +
                "- Phòng ngủ: giường, tab đầu giường, tủ quần áo, đèn ngủ.\n" +
                "- Phòng bếp: bàn ăn, ghế ăn, tủ bếp.\n" +
                "- Phòng làm việc: bàn làm việc, ghế, kệ sách.\n\n" +

                "=== QUY TẮC DIỆN TÍCH ===\n" +
                "- Dưới 12m2: ưu tiên sản phẩm nhỏ gọn.\n" +
                "- 12-20m2: kích thước tiêu chuẩn.\n" +
                "- Trên 20m2: có thể chọn sản phẩm lớn hơn.\n" +
                "Dựa vào kích thước (Dài x Rộng x Cao) trong 'Thông số' để chọn cho phù hợp.\n\n" +

                "=== QUY TẮC NGÂN SÁCH ===\n" +
                "- Với sản phẩm THAY THẾ nhau (cùng danh mục): giá TỪNG sản phẩm phải nhỏ hơn hoặc bằng ngân sách. TUYỆT ĐỐI KHÔNG cộng dồn giá các lựa chọn thay thế.\n"
                +
                "- Chỉ khi khách yêu cầu COMBO nhiều món KHÁC danh mục: tổng giá combo mới cần nhỏ hơn hoặc bằng ngân sách.\n" +
                "- Không đề xuất sản phẩm vượt ngân sách nếu còn lựa chọn phù hợp.\n\n" +

                "=== THAY THẾ vs BỔ SUNG ===\n" +
                "- THAY THẾ: cùng danh mục (nhiều mẫu Sofa...) — là các lựa chọn cho cùng một nhu cầu; chọn 1 sản phẩm tốt nhất làm đề xuất chính, còn lại là lựa chọn thay thế.\n"
                +
                "- BỔ SUNG: khác danh mục dùng chung không gian (Sofa + bàn trà + đèn) — có thể đi kèm nhau.\n" +
                "TUYỆT ĐỐI KHÔNG gộp giá các sản phẩm thay thế thành 'tổng chi phí'. KHÔNG đưa con số tổng tiền vào message.\n\n" +

                "=== TRẢ LỜI CÂU HỎI THÔNG SỐ ===\n" +
                "Khi khách hỏi chi tiết (kích thước/chất liệu/màu/bảo hành/xuất xứ...): trả về \"type\": \"text\", message nêu ĐÚNG thông số được hỏi, lấy từ 'Thông số' của đúng sản phẩm (xác định qua tên trong câu hỏi hoặc sản phẩm vừa nhắc gần nhất). KHÔNG bịa số liệu; nếu 'Thông số' ghi 'Chưa cập nhật' thì nói trung thực là shop chưa cập nhật.\n\n"
                +

                "=== GIAO TIẾP ===\n" +
                "- Xưng 'em', gọi khách 'anh/chị'. Lịch sự, thân thiện. Nếu khách phàn nàn thì xin lỗi trước.\n\n" +

                "=== VÍ DỤ (chỉ minh hoạ ĐỊNH DẠNG JSON) ===\n" +
                "Khách: 'Xin chào'\n" +
                "{\"type\":\"text\",\"message\":\"Dạ em chào anh/chị! Em có thể giúp anh/chị tìm sofa, bàn ăn, giường ngủ... hoặc tư vấn bố trí không gian ạ.\"}\n"
                +
                "Khách: 'Tìm sofa phòng khách khoảng 10 triệu'\n" +
                "{\"type\":\"product_recommendation\",\"message\":\"Dạ với phòng khách và ngân sách khoảng 10 triệu, em xin gợi ý vài mẫu sofa phù hợp ạ:\",\"products\":[{\"id\":\"SF001\",\"highlights\":[\"Đệm êm cao cấp\",\"Phù hợp phòng khách vừa\",\"Tông màu dễ phối\"]}]}\n"
                +
                "Khách: 'Mẫu giường đó cao bao nhiêu?'\n" +
                "{\"type\":\"text\",\"message\":\"Dạ mẫu giường đó có chiều cao 120 cm ạ.\"}\n";
    }

    // ====================================================================
    // =============== PARSE JSON CỦA AI & HYDRATE TỪ DB ==================
    // ====================================================================

    private ChatResponse buildResponseFromAi(String aiContent,
            Map<String, Product> byId,
            Map<String, String> categoryNames) {
        JsonNode root = parseJsonLenient(aiContent);

        if (root == null) {
            // Không parse được JSON -> trả text an toàn (đã làm sạch markdown/HTML)
            String fallback = sanitizeText(aiContent);
            if (fallback.isBlank()) {
                fallback = "Dạ em chưa rõ ý của anh/chị, anh/chị mô tả thêm giúp em nhé!";
            }
            return ChatResponse.text(fallback);
        }

        String type = root.path("type").asText(ChatResponse.TYPE_TEXT);
        String message = sanitizeText(root.path("message").asText(""));

        List<ChatProductDTO> hydrated = new ArrayList<>();
        if (ChatResponse.TYPE_PRODUCT_RECOMMENDATION.equals(type)) {
            JsonNode productsNode = root.path("products");
            if (productsNode.isArray()) {
                Set<String> usedIds = new LinkedHashSet<>();
                for (JsonNode pn : productsNode) {
                    String id = pn.path("id").asText("").trim();
                    if (id.isEmpty() || usedIds.contains(id)) {
                        continue;
                    }
                    Product p = byId.get(id);
                    if (p == null) {
                        continue; // chặn id bịa / sản phẩm ngoài kho
                    }
                    usedIds.add(id);
                    hydrated.add(toCard(p, categoryNames, extractHighlights(pn, p)));
                    if (hydrated.size() >= MAX_RECOMMENDATIONS) {
                        break;
                    }
                }
            }
        }

        if (message.isBlank()) {
            message = hydrated.isEmpty()
                    ? "Dạ em chưa tìm thấy sản phẩm phù hợp, anh/chị mô tả thêm nhu cầu giúp em nhé!"
                    : "Dạ với nhu cầu của anh/chị, em xin gợi ý các lựa chọn phù hợp:";
        }

        // Nếu AI nói recommendation nhưng không có id hợp lệ -> hạ về text (tránh carousel rỗng)
        return hydrated.isEmpty()
                ? ChatResponse.text(message)
                : ChatResponse.recommendation(message, hydrated);
    }

    /** Parse JSON "khoan dung": bỏ code fence, hoặc trích object {...} đầu/cuối nếu cần. */
    private JsonNode parseJsonLenient(String content) {
        if (content == null) {
            return null;
        }
        String c = content.trim();
        if (c.isEmpty()) {
            return null;
        }
        // Bỏ code fence ```json ... ```
        if (c.startsWith("```")) {
            c = c.replaceFirst("^```[a-zA-Z]*", "").trim();
            if (c.endsWith("```")) {
                c = c.substring(0, c.length() - 3).trim();
            }
        }
        try {
            return objectMapper.readTree(c);
        } catch (Exception ignored) {
            // thử trích object JSON đầu tiên -> đóng ngoặc cuối cùng
        }
        int start = c.indexOf('{');
        int end = c.lastIndexOf('}');
        if (start >= 0 && end > start) {
            try {
                return objectMapper.readTree(c.substring(start, end + 1));
            } catch (Exception ignored) {
                // bỏ qua
            }
        }
        return null;
    }

    /** Dựng thẻ sản phẩm CÓ CẤU TRÚC từ dữ liệu DB (nguồn sự thật) + highlights của AI. */
    private ChatProductDTO toCard(Product p, Map<String, String> categoryNames, List<String> highlights) {
        PriceInfo pi = computePrice(p);
        String category = categoryNames.getOrDefault(safe(p.getCategoryId()), "Khác");
        return ChatProductDTO.builder()
                .id(p.getProductId())
                .name(p.getProductName())
                .price(pi.price)
                .oldPrice(pi.oldPrice)
                .image(resolveImageUrl(p))
                .url("/product/" + p.getProductId())
                .category(category)
                .highlights(highlights)
                .build();
    }

    // ====================================================================
    // ====== THAM CHIẾU SẢN PHẨM THEO SỐ THỨ TỰ (NGỮ CẢNH HỘI THOẠI) =====
    // ====================================================================

    /**
     * Nếu câu hỏi là tham chiếu theo số thứ tự tới danh sách gợi ý GẦN NHẤT
     * (vd: "sản phẩm số 2", "xem chi tiết mẫu thứ 3", "thông tin mẫu thứ nhất"),
     * trả về phản hồi product_detail tương ứng (KHÔNG gọi AI, không hỏi lại tên).
     * Ngược lại trả null để đi tiếp luồng tư vấn AI bình thường.
     */
    private ChatResponse tryResolveOrdinalReference(ChatRequest request) {
        List<String> lastIds = request.getLastRecommendedProductIds();
        if (lastIds == null || lastIds.isEmpty()) {
            return null;
        }
        List<String> ids = lastIds.stream()
                .filter(s -> s != null && !s.isBlank())
                .collect(Collectors.toList());
        if (ids.isEmpty()) {
            return null;
        }

        Integer ordinal = detectOrdinalReference(request.getMessage(), ids.size());
        if (ordinal == null) {
            return null; // không phải tham chiếu thứ tự -> để AI xử lý
        }
        if (ordinal < 1 || ordinal > ids.size()) {
            // Có ý định tham chiếu nhưng vượt phạm vi -> hỏi lại nhẹ nhàng
            return ChatResponse.text("Dạ danh sách em vừa gợi ý chỉ có " + ids.size()
                    + " mẫu thôi ạ. Anh/chị muốn xem chi tiết mẫu số mấy (1-" + ids.size() + ") giúp em nhé?");
        }

        String productId = ids.get(ordinal - 1);
        Optional<Product> productOpt = productRepository.findById(productId);
        if (productOpt.isEmpty()) {
            return null; // sản phẩm không còn -> để AI xử lý tự nhiên
        }

        Product p = productOpt.get();
        Map<String, String> categoryNames = loadCategoryDisplayNames();
        ChatProductDTO detail = toDetailCard(p, categoryNames);
        String message = "Dạ đây là thông tin chi tiết của " + p.getProductName()
                + " (mẫu số " + ordinal + ") ạ:";
        return ChatResponse.detail(message, detail);
    }

    private static final Map<String, Integer> ORDINAL_WORDS = new HashMap<>();
    static {
        ORDINAL_WORDS.put("nhat", 1);
        ORDINAL_WORDS.put("nhi", 2);
        ORDINAL_WORDS.put("hai", 2);
        ORDINAL_WORDS.put("ba", 3);
        ORDINAL_WORDS.put("tu", 4);
        ORDINAL_WORDS.put("bon", 4);
        ORDINAL_WORDS.put("nam", 5);
        ORDINAL_WORDS.put("sau", 6);
        ORDINAL_WORDS.put("bay", 7);
        ORDINAL_WORDS.put("tam", 8);
        ORDINAL_WORDS.put("chin", 9);
        ORDINAL_WORDS.put("muoi", 10);
    }

    // Nếu con số đứng ngay trước các đơn vị này thì đó là ngân sách/kích thước, KHÔNG phải số thứ tự.
    private static final String UNIT_LOOKAHEAD =
            "(?!\\s*(?:trieu|tr|nghin|ngan|ty|k|dong|m2|met|cm|kg|nam|ngay|thang)\\b)";

    /**
     * Nhận diện tham chiếu theo số thứ tự. Trả về vị trí 1-based, null nếu không phải.
     * "cuối/cuối cùng" -> phần tử cuối ({@code size}). Chỉ kích hoạt khi có từ khóa neo
     * (sản phẩm/mẫu/cái/số/thứ...) đứng cạnh con số/chữ số -> tránh nhầm với ngân sách.
     */
    private Integer detectOrdinalReference(String message, int size) {
        if (message == null) {
            return null;
        }
        String norm = normalize(message).trim().replaceAll("\\s+", " ");
        if (norm.isEmpty()) {
            return null;
        }

        // 0) Cả câu chỉ là một con số: "2"
        if (norm.matches("0*\\d{1,2}")) {
            return Integer.parseInt(norm);
        }
        // 1) "cuoi" / "cuoi cung" -> phần tử cuối
        if (size > 0 && Pattern.compile("\\bcuoi(?:\\s+cung)?\\b").matcher(norm).find()) {
            return size;
        }
        // 2) "dau tien" / từ khóa neo + "dau" -> phần tử đầu
        if (Pattern.compile("\\bdau(?:\\s+tien)?\\b").matcher(norm).find()
                && Pattern.compile("\\b(?:san pham|sp|mau|cai|mon|chiec|cuon|loai)\\b").matcher(norm).find()) {
            return 1;
        }
        // 3a) TÍN HIỆU MẠNH: "so N" / "thu N" (số 2, thứ 3) ở bất kỳ đâu trong câu
        Matcher mStrong = Pattern.compile("\\b(?:so|thu)\\s*0*(\\d{1,2})\\b" + UNIT_LOOKAHEAD).matcher(norm);
        if (mStrong.find()) {
            return Integer.parseInt(mStrong.group(1));
        }
        // 3b) TÍN HIỆU YẾU: từ khóa neo + số Ở CUỐI câu ("sản phẩm 2", "mẫu 2", "cái 2").
        //     Bắt buộc số ở cuối để tránh nhầm "mẫu 2 chỗ", "sofa 3 chỗ"...
        Matcher mWeak = Pattern.compile(
                "\\b(?:san pham|sp|mau|cai|mon|chiec|cuon|loai)\\s+0*(\\d{1,2})\\s*$").matcher(norm);
        if (mWeak.find()) {
            return Integer.parseInt(mWeak.group(1));
        }
        // 4) "thu" + chữ số thứ tự: "thứ nhất", "thứ ba", "thứ tư"... (buộc có "thứ" để tránh nhầm)
        Matcher mWord = Pattern.compile(
                "\\bthu\\s+(nhat|nhi|hai|ba|tu|bon|nam|sau|bay|tam|chin|muoi)\\b").matcher(norm);
        if (mWord.find()) {
            return ORDINAL_WORDS.get(mWord.group(1));
        }
        return null;
    }

    /** Dựng thẻ CHI TIẾT sản phẩm (kèm mô tả, bảng thông số, tình trạng còn hàng). */
    private ChatProductDTO toDetailCard(Product p, Map<String, String> categoryNames) {
        PriceInfo pi = computePrice(p);
        String category = categoryNames.getOrDefault(safe(p.getCategoryId()), "Khác");
        return ChatProductDTO.builder()
                .id(p.getProductId())
                .name(p.getProductName())
                .price(pi.price)
                .oldPrice(pi.oldPrice)
                .image(resolveImageUrl(p))
                .url("/product/" + p.getProductId())
                .category(category)
                .description(truncate(p.getDescription(), 400))
                .specs(buildSpecItems(p))
                .inStock(p.getQuantity() > 0)
                .build();
    }

    /** Bảng thông số có cấu trúc (label/value) cho thẻ chi tiết. */
    private List<ChatSpecDTO> buildSpecItems(Product p) {
        List<ChatSpecDTO> specs = new ArrayList<>();

        if (p.getLength() != null && p.getWidth() != null && p.getHeight() != null) {
            specs.add(new ChatSpecDTO("Kích thước (D x R x C)",
                    String.format("%d x %d x %d cm", p.getLength(), p.getWidth(), p.getHeight())));
        } else if (p.getSize() != null && !p.getSize().isBlank()) {
            specs.add(new ChatSpecDTO("Kích thước", p.getSize().trim()));
        }

        if (p.getWeight() != null && p.getWeight() > 0) {
            if (p.getWeight() >= 1000) {
                double kg = p.getWeight() / 1000.0;
                String kgStr = (kg == Math.floor(kg)) ? String.valueOf((long) kg) : String.format("%.1f", kg);
                specs.add(new ChatSpecDTO("Cân nặng", kgStr + " kg"));
            } else {
                specs.add(new ChatSpecDTO("Cân nặng", p.getWeight() + " g"));
            }
        }

        if (p.getColor() != null && !p.getColor().isBlank()) {
            specs.add(new ChatSpecDTO("Màu sắc", p.getColor().trim()));
        }
        if (p.getMaterial() != null && !p.getMaterial().isBlank()) {
            specs.add(new ChatSpecDTO("Chất liệu", p.getMaterial().trim()));
        }
        if (p.getWarranty() != null && !p.getWarranty().isBlank()) {
            specs.add(new ChatSpecDTO("Bảo hành", p.getWarranty().trim()));
        }
        if (p.getOrigin() != null && !p.getOrigin().isBlank()) {
            specs.add(new ChatSpecDTO("Xuất xứ", p.getOrigin().trim()));
        }

        return specs;
    }

    /**
     * Tính giá theo ĐÚNG quy ước hiển thị của cửa hàng (xem Products.jsx):
     * - price (giá bán) = giá niêm yết * (1 - discount/100) khi có giảm giá.
     * - oldPrice (giá gốc gạch ngang) = giá niêm yết; null khi không giảm giá.
     */
    private PriceInfo computePrice(Product p) {
        BigDecimal list = p.getPrice();
        if (list == null) {
            return new PriceInfo(BigDecimal.ZERO, null);
        }
        BigDecimal discount = p.getDiscount();
        if (discount != null
                && discount.compareTo(BigDecimal.ZERO) > 0
                && discount.compareTo(BigDecimal.valueOf(100)) < 0) {
            BigDecimal factor = BigDecimal.valueOf(100).subtract(discount);
            BigDecimal finalPrice = list.multiply(factor)
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            return new PriceInfo(finalPrice, list);
        }
        return new PriceInfo(list, null);
    }

    /** Lấy URL ảnh tuyệt đối (giữ nguyên link http; ghép base cho đường dẫn tương đối). */
    private String resolveImageUrl(Product p) {
        String rawImg = (p.getImages() != null && !p.getImages().isEmpty())
                ? p.getImages().get(0).getUrl()
                : null;
        if (rawImg == null || rawImg.isEmpty()) {
            return "https://via.placeholder.com/300x200.png?text=No+Image";
        }
        if (rawImg.startsWith("http")) {
            return rawImg;
        }
        String path = rawImg.startsWith("/") ? rawImg : "/" + rawImg;
        return IMAGE_BASE_URL + path;
    }

    /** Lấy & làm sạch highlights từ JSON của AI; nếu thiếu thì suy ra từ thông số DB. */
    private List<String> extractHighlights(JsonNode pn, Product fallbackProduct) {
        List<String> out = new ArrayList<>();
        JsonNode hl = pn.path("highlights");
        if (hl.isArray()) {
            for (JsonNode h : hl) {
                String s = sanitizeText(h.asText(""));
                if (s.isEmpty()) {
                    continue;
                }
                if (s.length() > 60) {
                    s = s.substring(0, 60).trim();
                }
                out.add(s);
                if (out.size() >= 4) {
                    break;
                }
            }
        }
        if (out.isEmpty()) {
            out = fallbackHighlights(fallbackProduct);
        }
        return out;
    }

    /** Highlights dự phòng dựng từ thông số DB khi AI không cung cấp. */
    private List<String> fallbackHighlights(Product p) {
        List<String> out = new ArrayList<>();
        if (p.getMaterial() != null && !p.getMaterial().isBlank()) {
            out.add("Chất liệu " + p.getMaterial().trim());
        }
        if (p.getWarranty() != null && !p.getWarranty().isBlank()) {
            out.add("Bảo hành " + p.getWarranty().trim());
        }
        if (p.getColor() != null && !p.getColor().isBlank()) {
            out.add("Màu " + p.getColor().trim());
        }
        if (out.isEmpty()) {
            out.add("Hàng có sẵn tại NPH Store");
        }
        return out;
    }

    /** Loại bỏ markdown/HTML khỏi văn bản do AI sinh (phòng khi AI không tuân thủ). */
    private String sanitizeText(String s) {
        if (s == null) {
            return "";
        }
        String t = s;
        t = t.replaceAll("!\\[[^\\]]*\\]\\([^)]*\\)", " "); // ảnh markdown ![alt](url)
        t = t.replaceAll("\\[([^\\]]*)\\]\\([^)]*\\)", "$1"); // link markdown [text](url) -> text
        t = t.replaceAll("<[^>]+>", " "); // thẻ HTML
        t = t.replace("**", "").replace("__", "").replace("`", "");
        t = t.replaceAll("(?m)^#+\\s*", ""); // tiêu đề markdown
        t = t.replaceAll("[ \\t]+", " ");
        t = t.replaceAll("\\s*\\n\\s*\\n\\s*", "\n"); // gộp dòng trống
        return t.trim();
    }

    private Map<String, String> loadCategoryDisplayNames() {
        Map<String, String> map = new HashMap<>();
        for (Category c : categoryRepository.findAll()) {
            if (c.getCategoryId() != null) {
                map.put(c.getCategoryId(), safe(c.getCategoryName()));
            }
        }
        return map;
    }

    /**
     * Dựng context kho hàng để gửi cho AI. Bao gồm 'ID' (để AI tham chiếu) nhưng KHÔNG
     * gồm link/ảnh — các trường này backend tự dựng sau khi hydrate, tránh AI tự tạo URL.
     */
    private String buildProductContext(List<Product> products, Map<String, String> categoryNames) {
        if (products.isEmpty()) {
            return "Kho đang cập nhật (không có sản phẩm phù hợp).";
        }
        return products.stream()
                .map(p -> {
                    PriceInfo pi = computePrice(p);
                    String priceTxt = pi.oldPrice != null
                            ? String.format("Giá bán: %s VNĐ (giá gốc %s VNĐ)", fmt(pi.price), fmt(pi.oldPrice))
                            : String.format("Giá bán: %s VNĐ", fmt(pi.price));
                    String category = categoryNames.getOrDefault(safe(p.getCategoryId()), "Khác");
                    String status = p.getQuantity() > 0 ? "CÒN HÀNG" : "HẾT HÀNG";
                    return String.format(
                            "- ID: %s | Tên: %s | Danh mục: %s | Trạng thái: %s | %s | Thông số: %s | Mô tả: %s",
                            p.getProductId(),
                            p.getProductName(),
                            category,
                            status,
                            priceTxt,
                            buildProductSpecs(p),
                            truncate(p.getDescription(), 150));
                })
                .collect(Collectors.joining("\n"));
    }

    private String fmt(BigDecimal bd) {
        return bd == null ? "0" : bd.setScale(0, RoundingMode.HALF_UP).toPlainString();
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

    /** Cặp giá bán / giá gốc đã tính theo quy ước hiển thị của cửa hàng. */
    private static class PriceInfo {
        final BigDecimal price;
        final BigDecimal oldPrice;

        PriceInfo(BigDecimal price, BigDecimal oldPrice) {
            this.price = price;
            this.oldPrice = oldPrice;
        }
    }
}
