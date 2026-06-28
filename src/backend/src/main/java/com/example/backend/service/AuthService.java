package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public String register(User user) {
        // Kiểm tra email tồn tại
        if (userRepository.existsByEmail(user.getEmail())) {
            return "Email already exists";
        }

        // Tạo ID ngẫu nhiên và mã hóa mật khẩu
        user.setUserId(UUID.randomUUID().toString());
        user.setPassword(encoder.encode(user.getPassword()));
        user.setRole(user.getRole() == null ? "USER" : user.getRole());

        userRepository.save(user);
        return "Register successful";
    }

    public String login(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);

        if (userOpt.isPresent() && encoder.matches(password, userOpt.get().getPassword())) {
            return jwtService.generateToken(email);
        }

        return null; // Sai email hoặc mật khẩu
    }

    // Tìm user theo email (dùng để phân biệt lỗi đăng nhập)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    // Kiểm tra mật khẩu khớp với user
    public boolean checkPassword(String rawPassword, User user) {
        return encoder.matches(rawPassword, user.getPassword());
    }

    public String logout(String token) {
        // Có thể bổ sung cơ chế blacklist JWT nếu cần
        return "Logout successful";
    }

    public User processOAuth2User(String email, String name, String picture, String googleId) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        User user;
        if (userOpt.isEmpty()) {
            user = new User();
            user.setUserId(UUID.randomUUID().toString());
            user.setEmail(email);
            user.setFullName(name != null ? name : "Google User");
            user.setAvatar(picture);
            user.setRole("USER");
            user.setProvider("GOOGLE");
            user.setProviderId(googleId);
            user.setPassword(encoder.encode("GOOGLE_AUTH"));
            userRepository.save(user);
        } else {
            user = userOpt.get();
            user.setProvider("GOOGLE");
            user.setProviderId(googleId);
            if (picture != null && (user.getAvatar() == null || user.getAvatar().isEmpty())) {
                user.setAvatar(picture);
            }
            userRepository.save(user);
        }
        return user;
    }
}
