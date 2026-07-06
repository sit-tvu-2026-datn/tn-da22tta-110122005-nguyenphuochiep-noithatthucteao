package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.service.AuthService;
import com.example.backend.service.PasswordResetService;
import com.example.backend.service.PasswordResetService.ForgotResult;
import com.example.backend.service.PasswordResetService.ResetResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        String result = authService.register(user);
        if (result.equals("Email already exists")) {
            return ResponseEntity.badRequest().body(Map.of("error", result));
        }
        return ResponseEntity.ok(Map.of("message", result));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String password = req.get("password");

        // 1. Thiếu trường
        if (email == null || email.trim().isEmpty() || password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vui lòng nhập đầy đủ email và mật khẩu",
                    "code", "MISSING_FIELDS"));
        }

        email = email.trim();

        // 2. Tài khoản chưa được đăng ký
        Optional<User> userOpt = authService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "error", "Tài khoản chưa được đăng ký",
                    "code", "ACCOUNT_NOT_FOUND"));
        }

        User user = userOpt.get();

        // 3. Tài khoản đăng nhập bằng Google (không có mật khẩu thường)
        if ("GOOGLE".equalsIgnoreCase(user.getProvider())
                && !authService.checkPassword(password, user)) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Tài khoản này đăng nhập bằng Google. Vui lòng dùng nút \"Đăng nhập bằng Google\".",
                    "code", "GOOGLE_ACCOUNT"));
        }

        // 4. Sai mật khẩu
        String token = authService.login(email, password);
        if (token == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Mật khẩu không chính xác",
                    "code", "WRONG_PASSWORD"));
        }

        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(Map.of("message", authService.logout(token)));
    }

    /**
     * Bước 1: Gửi mã OTP đặt lại mật khẩu về email của người dùng.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vui lòng nhập email", "code", "MISSING_FIELDS"));
        }

        ForgotResult result = passwordResetService.createAndSend(email.trim());
        return switch (result) {
            case SENT -> ResponseEntity.ok(Map.of(
                    "message", "Mã xác thực đã được gửi tới email của bạn."));
            case NOT_FOUND -> ResponseEntity.status(404).body(Map.of(
                    "error", "Tài khoản chưa được đăng ký", "code", "ACCOUNT_NOT_FOUND"));
            case GOOGLE_ACCOUNT -> ResponseEntity.status(400).body(Map.of(
                    "error", "Tài khoản này đăng nhập bằng Google, không thể đặt lại mật khẩu.",
                    "code", "GOOGLE_ACCOUNT"));
            case COOLDOWN -> ResponseEntity.status(429).body(Map.of(
                    "error", "Vui lòng chờ một chút trước khi yêu cầu mã mới.",
                    "code", "COOLDOWN"));
            case EMAIL_FAILED -> ResponseEntity.status(502).body(Map.of(
                    "error", "Không thể gửi email lúc này. Vui lòng thử lại sau.",
                    "code", "EMAIL_FAILED"));
        };
    }

    /**
     * Bước 2 (tuỳ chọn): Kiểm tra nhanh OTP có hợp lệ không trước khi cho nhập mật khẩu mới.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String otp = req.get("otp");
        if (email == null || email.trim().isEmpty() || otp == null || otp.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vui lòng nhập đầy đủ email và mã OTP", "code", "MISSING_FIELDS"));
        }

        ResetResult result = passwordResetService.verify(email.trim(), otp.trim());
        return switch (result) {
            case SUCCESS -> ResponseEntity.ok(Map.of("valid", true));
            case EXPIRED -> ResponseEntity.status(400).body(Map.of(
                    "error", "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.", "code", "OTP_EXPIRED"));
            default -> ResponseEntity.status(400).body(Map.of(
                    "error", "Mã OTP không chính xác.", "code", "INVALID_OTP"));
        };
    }

    /**
     * Bước 3: Xác thực OTP và đặt lại mật khẩu mới.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> req) {
        String email = req.get("email");
        String otp = req.get("otp");
        String newPassword = req.get("newPassword");

        if (email == null || email.trim().isEmpty()
                || otp == null || otp.trim().isEmpty()
                || newPassword == null || newPassword.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Vui lòng nhập đầy đủ thông tin", "code", "MISSING_FIELDS"));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Mật khẩu phải có ít nhất 6 ký tự", "code", "WEAK_PASSWORD"));
        }

        ResetResult result = passwordResetService.reset(email.trim(), otp.trim(), newPassword);
        return switch (result) {
            case SUCCESS -> ResponseEntity.ok(Map.of(
                    "message", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại."));
            case EXPIRED -> ResponseEntity.status(400).body(Map.of(
                    "error", "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.", "code", "OTP_EXPIRED"));
            case NOT_FOUND -> ResponseEntity.status(404).body(Map.of(
                    "error", "Tài khoản chưa được đăng ký", "code", "ACCOUNT_NOT_FOUND"));
            default -> ResponseEntity.status(400).body(Map.of(
                    "error", "Mã OTP không chính xác.", "code", "INVALID_OTP"));
        };
    }
}
