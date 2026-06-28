package com.example.backend.repository;

import com.example.backend.model.UserPreferenceProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferenceProfileRepository extends JpaRepository<UserPreferenceProfile, Long> {

    // Lấy hồ sơ sở thích của một người dùng (mỗi user chỉ có 1 hồ sơ - unique)
    Optional<UserPreferenceProfile> findByUserId(String userId);

    // Xóa hồ sơ khi cần build lại (vd: người dùng có tương tác mới)
    void deleteByUserId(String userId);
}
