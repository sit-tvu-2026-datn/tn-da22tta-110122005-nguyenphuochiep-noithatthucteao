package com.example.backend.repository;

import com.example.backend.model.UserProductInteraction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository xử lý các thao tác cơ sở dữ liệu đối với tương tác người dùng - sản phẩm (UserProductInteraction).
 */
@Repository
public interface UserProductInteractionRepository extends JpaRepository<UserProductInteraction, Long> {

    /**
     * Tìm tất cả các tương tác của một người dùng cụ thể.
     */
    List<UserProductInteraction> findByUserId(String userId);

    /**
     * Tìm tất cả các tương tác của một sản phẩm cụ thể.
     */
    List<UserProductInteraction> findByProductId(String productId);

    /**
     * Lấy danh sách các ID người dùng duy nhất đã có tương tác.
     */
    @Query("SELECT DISTINCT u.userId FROM UserProductInteraction u")
    List<String> findDistinctUserIds();

    /**
     * Lấy danh sách các ID sản phẩm duy nhất đã được tương tác.
     */
    @Query("SELECT DISTINCT u.productId FROM UserProductInteraction u")
    List<String> findDistinctProductIds();

    /**
     * Đếm tổng số lượng tương tác của một người dùng cụ thể.
     */
    long countByUserId(String userId);

    /**
     * Tìm các tương tác cụ thể của người dùng với sản phẩm.
     */
    List<UserProductInteraction> findByUserIdAndProductId(String userId, String productId);

    /**
     * Xóa tương tác của người dùng với sản phẩm theo loại tương tác.
     */
    void deleteByUserIdAndProductIdAndInteractionType(String userId, String productId, String interactionType);
}
