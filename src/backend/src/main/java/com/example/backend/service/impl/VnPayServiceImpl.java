package com.example.backend.service.impl;

import com.example.backend.config.VnPayConfig;
import com.example.backend.service.VnPayService;
import com.example.backend.util.VnPayUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class VnPayServiceImpl implements VnPayService {

    private final VnPayConfig vnPayConfig;

    @Override
    public String createPayment(int amount, String language, HttpServletRequest req) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String orderType = "other";
        String vnp_TxnRef = UUID.randomUUID().toString().replace("-", ""); // tự sinh
        
        // Lấy đúng IP client khi chạy sau proxy Render bằng X-Forwarded-For
        String vnp_IpAddr = req.getHeader("X-Forwarded-For");
        if (vnp_IpAddr == null || vnp_IpAddr.isEmpty() || "unknown".equalsIgnoreCase(vnp_IpAddr)) {
            vnp_IpAddr = req.getRemoteAddr();
        } else {
            // Lấy IP đầu tiên trong danh sách (nếu qua nhiều proxy)
            int commaIndex = vnp_IpAddr.indexOf(",");
            if (commaIndex != -1) {
                vnp_IpAddr = vnp_IpAddr.substring(0, commaIndex).trim();
            }
        }
        
        String vnp_TmnCode = vnPayConfig.getTmnCode();

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Version", vnp_Version);
        params.put("vnp_Command", vnp_Command);
        params.put("vnp_TmnCode", vnp_TmnCode);
        params.put("vnp_Amount", String.valueOf(amount * 100)); // gửi nguyên số tiền *100
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", vnp_TxnRef);
        params.put("vnp_OrderInfo", "Thanh toán đơn hàng " + vnp_TxnRef);
        params.put("vnp_OrderType", orderType);
        params.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        params.put("vnp_IpAddr", vnp_IpAddr);

        if (language != null && !language.isEmpty()) {
            params.put("vnp_Locale", language);
        } else {
            params.put("vnp_Locale", "vn");
        }

        // Dùng java.time để xử lý múi giờ nhất quán trên mọi môi trường (Local, Render,...)
        ZoneId vietnamZone = ZoneId.of("Asia/Ho_Chi_Minh");
        ZonedDateTime now = ZonedDateTime.now(vietnamZone);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        
        String vnp_CreateDate = now.format(fmt);
        String vnp_ExpireDate = now.plusMinutes(15).format(fmt);
        
        params.put("vnp_CreateDate", vnp_CreateDate);
        params.put("vnp_ExpireDate", vnp_ExpireDate);

        // Logging thông tin timezone và thời gian để debug
        log.info("=== VNPAY URL CREATION LOGS ===");
        log.info("Server Default Timezone : {}", ZoneId.systemDefault());
        log.info("Server Current Time     : {}", ZonedDateTime.now());
        log.info("Target Timezone         : {}", vietnamZone);
        log.info("vnp_CreateDate          : {}", vnp_CreateDate);
        log.info("vnp_ExpireDate          : {}", vnp_ExpireDate);
        log.info("Client IP Address       : {}", vnp_IpAddr);

        try {
            String queryUrl = VnPayUtil.buildQuery(params);
            String vnp_SecureHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), queryUrl);
            String paymentUrl = vnPayConfig.getPayUrl() + "?" + queryUrl + "&vnp_SecureHash=" + vnp_SecureHash;
            
            log.info("Generated Payment URL   : {}", paymentUrl);
            log.info("=================================");
            return paymentUrl;
        } catch (Exception e) {
            log.error("Lỗi khi tạo payment URL VNPAY", e);
            throw new RuntimeException("Error creating VNPAY URL", e);
        }
    }

    @Override
    public Map<String, Object> processReturn(HttpServletRequest req) {
        Map<String, Object> result = new HashMap<>();
        try {
            String queryString = req.getQueryString();
            log.info("VNPAY Return - Query String: {}", queryString);
            
            if (queryString == null || queryString.isEmpty()) {
                result.put("success", false);
                result.put("message", "Invalid request");
                return result;
            }

            Map<String, String> fields = new HashMap<>();
            String vnp_SecureHash = null;
            for (String part : queryString.split("&")) {
                String[] kv = part.split("=", 2);
                if (kv.length == 0) continue;
                String key = kv[0];
                String val = kv.length > 1 ? kv[1] : "";
                
                // Chỉ lấy các tham số bắt đầu bằng vnp_ và bỏ qua các tham số ký
                if (key.startsWith("vnp_")) {
                    if (key.equals("vnp_SecureHash")) {
                        vnp_SecureHash = val;
                    } else if (!key.equals("vnp_SecureHashType")) {
                        fields.put(key, val);
                    }
                }
            }

            Map<String, String> sorted = new TreeMap<>(fields);
            StringBuilder hashData = new StringBuilder();
            Iterator<Map.Entry<String, String>> it = sorted.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<String, String> e = it.next();
                hashData.append(e.getKey()).append("=").append(e.getValue());
                if (it.hasNext()) hashData.append("&");
            }

            String calculatedHash = VnPayUtil.hmacSHA512(vnPayConfig.getHashSecret(), hashData.toString());
            log.info("VNPAY Return - Received Hash: {}, Calculated Hash: {}", vnp_SecureHash, calculatedHash);
            
            if (!calculatedHash.equalsIgnoreCase(vnp_SecureHash)) {
                log.warn("VNPAY Return - Chữ ký không hợp lệ!");
                result.put("success", false);
                result.put("message", "Invalid signature");
                return result;
            }

            String vnp_ResponseCode = sorted.get("vnp_ResponseCode");
            String vnp_TransactionStatus = sorted.get("vnp_TransactionStatus");
            String vnp_TxnRef = sorted.get("vnp_TxnRef");
            String vnp_Amount = sorted.get("vnp_Amount");

            boolean success = "00".equals(vnp_ResponseCode) && "00".equals(vnp_TransactionStatus);
            result.put("success", success);
            result.put("txnRef", vnp_TxnRef);
            
            long amountVal = 0;
            if (vnp_Amount != null && !vnp_Amount.isEmpty()) {
                amountVal = Long.parseLong(vnp_Amount) / 100;
            }
            result.put("amount", amountVal); // hiển thị đúng VND
            result.put("message", success ? "Thanh toán thành công!" : "Thanh toán thất bại!");
            
            log.info("VNPAY Return - Transaction Status: {}, Success: {}, TxnRef: {}", vnp_TransactionStatus, success, vnp_TxnRef);
            return result;
        } catch (Exception e) {
            log.error("Lỗi xử lý phản hồi thanh toán VNPAY", e);
            result.put("success", false);
            result.put("message", "Lỗi xử lý thanh toán: " + e.getMessage());
            return result;
        }
    }
}

