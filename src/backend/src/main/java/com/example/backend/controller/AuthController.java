package com.example.backend.controller;

import com.example.backend.model.User;
import com.example.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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
}
