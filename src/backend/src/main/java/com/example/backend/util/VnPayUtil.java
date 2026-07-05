package com.example.backend.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Tiện ích ký/verify VNPAY theo đúng chuẩn tài liệu tích hợp VNPAY 2.1.0.
 *
 * Nguyên tắc bất di bất dịch (rút ra từ code tham chiếu chính thức của VNPAY):
 *  - Chuỗi để tính HMAC (hashData) và chuỗi query đưa lên URL phải được build
 *    bằng CÙNG một cách encode: URLEncoder.encode(value) (dấu cách -> '+').
 *  - TUYỆT ĐỐI KHÔNG đổi '+' thành '%20'. VNPAY verify chữ ký trên dạng chuẩn
 *    của URLEncoder (dấu cách là '+'), nên đổi sang '%20' sẽ làm sai chữ ký.
 *  - Tham số được sắp xếp tăng dần theo tên (alphabet) trước khi ký.
 */
public class VnPayUtil {

    public static String hmacSHA512(String key, String data) throws Exception {
        if (key == null || data == null) {
            throw new IllegalArgumentException("Key/Data để tính HMAC không được null");
        }
        Mac hmac512 = Mac.getInstance("HmacSHA512");
        SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
        hmac512.init(secretKey);
        byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hash = new StringBuilder(2 * bytes.length);
        for (byte b : bytes) {
            hash.append(String.format("%02x", b & 0xff));
        }
        return hash.toString();
    }

    /**
     * Build chuỗi query dùng CHUNG cho cả hashData (tính chữ ký) và URL thanh toán.
     *
     * Vì mọi tên tham số VNPAY (vnp_*) đều là ký tự ASCII an toàn nên
     * URLEncoder.encode(tên) == tên; do đó chuỗi này đồng thời là hashData
     * (tên=encode(value)) và là query (encode(tên)=encode(value)) đúng như
     * demo chính thức của VNPAY dựng ra hai StringBuilder song song.
     *
     * @param params Map ĐÃ được sắp xếp theo tên (dùng TreeMap ở nơi gọi).
     */
    public static String buildQuery(Map<String, String> params) throws Exception {
        StringBuilder sb = new StringBuilder();
        Iterator<Map.Entry<String, String>> it = params.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, String> entry = it.next();
            String value = entry.getValue();
            if (value != null && value.length() > 0) {
                sb.append(entry.getKey())
                        .append('=')
                        // KHÔNG .replace("+","%20") — giữ đúng chuẩn URLEncoder của VNPAY
                        .append(URLEncoder.encode(value, StandardCharsets.UTF_8));
                if (it.hasNext()) {
                    sb.append('&');
                }
            }
        }
        return sb.toString();
    }

    /**
     * Tính chữ ký cho callback/return theo đúng chuẩn VNPAY (hashAllFields).
     *
     * Map truyền vào là các trường đã được decode (từ request.getParameter) rồi
     * re-encode lại bằng URLEncoder — bảo đảm chuỗi ký ở bước verify ĐỒNG NHẤT
     * với chuỗi ký lúc tạo URL. vnp_SecureHash và vnp_SecureHashType phải được
     * loại bỏ khỏi map TRƯỚC khi gọi hàm này.
     */
    public static String hashAllFields(String hashSecret, Map<String, String> fields) throws Exception {
        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder sb = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = fields.get(fieldName);
            if (fieldValue != null && fieldValue.length() > 0) {
                sb.append(fieldName).append('=').append(fieldValue);
                if (itr.hasNext()) {
                    sb.append('&');
                }
            }
        }
        return hmacSHA512(hashSecret, sb.toString());
    }
}
