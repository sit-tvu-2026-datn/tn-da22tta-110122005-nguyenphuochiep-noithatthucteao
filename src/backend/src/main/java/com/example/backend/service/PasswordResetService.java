package com.example.backend.service;

import com.example.backend.model.User;
import com.example.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Xử lý luồng "Quên mật khẩu" bằng mã OTP 6 chữ số gửi qua email (Brevo).
 *
 * Mã OTP được lưu TRONG BỘ NHỚ (ConcurrentHashMap) — không tạo bảng mới trong DB:
 *   - Có thời hạn {@link #OTP_TTL_MINUTES} phút.
 *   - Giới hạn số lần nhập sai ({@link #MAX_VERIFY_ATTEMPTS}) để chống dò mã.
 *   - Có thời gian chờ gửi lại ({@link #RESEND_COOLDOWN_SECONDS}) để chống spam email.
 *   - Được dọn định kỳ qua @Scheduled.
 *
 * Phù hợp cho hệ thống 1 instance. Nếu scale nhiều instance thì nên thay bằng
 * Redis / bảng DB dùng chung.
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    public static final int OTP_TTL_MINUTES = 10;
    private static final int MAX_VERIFY_ATTEMPTS = 5;
    private static final long RESEND_COOLDOWN_SECONDS = 60;

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final BCryptPasswordEncoder passwordEncoder;

    private final SecureRandom random = new SecureRandom();
    private final Map<String, OtpEntry> store = new ConcurrentHashMap<>();

    public PasswordResetService(UserRepository userRepository,
                                EmailService emailService,
                                BCryptPasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    /** Một bản ghi OTP đang chờ trong bộ nhớ. */
    private static final class OtpEntry {
        final String code;
        final Instant expiresAt;
        final Instant sentAt;
        int attempts;

        OtpEntry(String code, Instant expiresAt, Instant sentAt) {
            this.code = code;
            this.expiresAt = expiresAt;
            this.sentAt = sentAt;
        }
    }

    /** Kết quả của bước yêu cầu gửi OTP. */
    public enum ForgotResult { SENT, NOT_FOUND, GOOGLE_ACCOUNT, COOLDOWN, EMAIL_FAILED }

    /** Kết quả của bước xác thực OTP / đặt lại mật khẩu. */
    public enum ResetResult { SUCCESS, INVALID_OTP, EXPIRED, NOT_FOUND }

    private String key(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    /**
     * Sinh OTP mới và gửi email. Trả về mã lỗi để controller phản hồi phù hợp.
     */
    public ForgotResult createAndSend(String email) {
        if (email == null || email.trim().isEmpty()) {
            return ForgotResult.NOT_FOUND;
        }
        String k = key(email);

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            return ForgotResult.NOT_FOUND;
        }
        User user = userOpt.get();

        // Tài khoản đăng nhập bằng Google không có mật khẩu thường để đặt lại.
        if ("GOOGLE".equalsIgnoreCase(user.getProvider())) {
            return ForgotResult.GOOGLE_ACCOUNT;
        }

        // Chống spam: chờ hết cooldown mới cho gửi lại.
        OtpEntry existing = store.get(k);
        if (existing != null
                && existing.sentAt.plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(Instant.now())) {
            return ForgotResult.COOLDOWN;
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant now = Instant.now();
        store.put(k, new OtpEntry(code, now.plus(OTP_TTL_MINUTES, ChronoUnit.MINUTES), now));

        try {
            emailService.sendPasswordResetEmail(user.getEmail(), user.getFullName(), code);
        } catch (Exception e) {
            store.remove(k); // gửi lỗi thì bỏ mã đã tạo để user thử lại từ đầu
            log.error("Gửi email OTP cho {} thất bại: {}", email, e.getMessage(), e);
            return ForgotResult.EMAIL_FAILED;
        }
        return ForgotResult.SENT;
    }

    /**
     * Kiểm tra OTP có hợp lệ không (KHÔNG xoá mã khi đúng — để bước reset dùng lại).
     * Mỗi lần gọi tính là 1 lần thử; vượt quá giới hạn thì huỷ mã.
     */
    public ResetResult verify(String email, String otp) {
        String k = key(email);
        OtpEntry entry = store.get(k);
        if (entry == null) {
            return ResetResult.INVALID_OTP;
        }
        if (entry.expiresAt.isBefore(Instant.now())) {
            store.remove(k);
            return ResetResult.EXPIRED;
        }
        if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
            store.remove(k);
            return ResetResult.EXPIRED; // hết lượt thử -> buộc yêu cầu mã mới
        }
        entry.attempts++;
        String given = otp == null ? "" : otp.trim();
        if (!entry.code.equals(given)) {
            return ResetResult.INVALID_OTP;
        }
        return ResetResult.SUCCESS;
    }

    /**
     * Xác thực OTP và đặt lại mật khẩu. Thành công thì xoá OTP để dùng 1 lần.
     */
    public ResetResult reset(String email, String otp, String newPassword) {
        ResetResult verdict = verify(email, otp);
        if (verdict != ResetResult.SUCCESS) {
            return verdict;
        }

        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (userOpt.isEmpty()) {
            return ResetResult.NOT_FOUND;
        }
        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        if (user.getProvider() == null || user.getProvider().isBlank()) {
            user.setProvider("LOCAL");
        }
        userRepository.save(user);

        store.remove(key(email));
        log.info("Đặt lại mật khẩu thành công cho {}.", email);
        return ResetResult.SUCCESS;
    }

    /** Dọn các OTP đã hết hạn mỗi 5 phút để bộ nhớ không phình. */
    @Scheduled(fixedRate = 5 * 60 * 1000)
    public void cleanupExpired() {
        Instant now = Instant.now();
        store.entrySet().removeIf(e -> e.getValue().expiresAt.isBefore(now));
    }
}
