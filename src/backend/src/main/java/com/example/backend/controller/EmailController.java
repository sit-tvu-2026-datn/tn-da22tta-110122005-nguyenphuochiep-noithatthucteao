package com.example.backend.controller;

import com.example.backend.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/emails")
@CrossOrigin(origins = "*")
public class EmailController {

    @Autowired
    private EmailService emailService;

    /**
     * Gửi lại email xác nhận đơn hàng (ví dụ cho admin gửi thủ công).
     * Email người nhận được lấy tự động từ tài khoản chủ đơn ở backend.
     */
    @PostMapping("/send-invoice")
    public ResponseEntity<?> sendInvoice(@RequestBody Map<String, String> request) {
        String orderId = request.get("orderId");
        emailService.sendOrderConfirmationEmail(orderId);
        return ResponseEntity.ok(Map.of("message", "Đã gửi yêu cầu gửi email cho đơn " + orderId));
    }
}
