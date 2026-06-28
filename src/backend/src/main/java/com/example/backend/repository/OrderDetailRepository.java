package com.example.backend.repository;

import com.example.backend.model.OrderDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OrderDetailRepository extends JpaRepository<OrderDetail, String> {

    List<OrderDetail> findByOrderOrderId(String orderId);

    @Query("SELECT od FROM OrderDetail od " +
            "JOIN FETCH od.order o " +
            "JOIN FETCH od.product p " +
            "WHERE o.userId = :userId")
    List<OrderDetail> findByUserIdWithOrderAndProduct(@Param("userId") String userId);

    @Query("SELECT od FROM OrderDetail od " +
            "JOIN od.order o " +
            "WHERE o.userId = :userId " +
            "AND od.product.productId = :productId " +
            "AND o.isOrder = false")
    Optional<OrderDetail> findExistingCartItem(@Param("userId") String userId,
                                               @Param("productId") String productId);

    @Query("SELECT p.category.categoryName, SUM(od.quantity) " +
            "FROM OrderDetail od " +
            "JOIN od.product p " +
            "JOIN od.order o " +
            "WHERE o.isOrder = true " +
            "GROUP BY p.category.categoryName " +
            "ORDER BY SUM(od.quantity) DESC")
    List<Object[]> findTopSellingCategories(Pageable pageable);

    @Query("SELECT p.productName, (SELECT max(img.url) FROM ProductImage img WHERE img.product = p), p.price, SUM(od.quantity) " +
            "FROM OrderDetail od " +
            "JOIN od.product p " +
            "JOIN od.order o " +
            "WHERE o.isOrder = true " +
            "GROUP BY p.productId, p.productName, p.price " +
            "ORDER BY SUM(od.quantity) DESC")
    List<Object[]> findTopSellingProducts(Pageable pageable);

    @Query("SELECT od.product.productId " +
            "FROM OrderDetail od " +
            "JOIN od.order o " +
            "WHERE o.isOrder = true " +
            "GROUP BY od.product.productId " +
            "ORDER BY SUM(od.quantity) DESC")
    List<String> findTopSellingProductIds(Pageable pageable);

    /**
     * Tổng số lượng đã bán theo sản phẩm trong khung thời gian gần đây (phục vụ Trending).
     * Trả về danh sách [productId, sumQuantity].
     */
    @Query("SELECT od.product.productId, SUM(od.quantity) " +
            "FROM OrderDetail od " +
            "JOIN od.order o " +
            "WHERE o.isOrder = true AND o.orderDate >= :since " +
            "GROUP BY od.product.productId")
    List<Object[]> sumPurchasesSince(@Param("since") LocalDateTime since);

    /**
     * Tìm các sản phẩm thường được mua chung với một sản phẩm (co-occurrence trong cùng đơn hàng).
     * Phục vụ tính năng "Khách hàng cũng mua". Trả về [productId, frequency] sắp xếp giảm dần.
     */
    @Query("SELECT od2.product.productId, COUNT(od2) " +
            "FROM OrderDetail od1, OrderDetail od2 " +
            "WHERE od1.order = od2.order " +
            "AND od1.product.productId = :productId " +
            "AND od2.product.productId <> :productId " +
            "AND od1.order.isOrder = true " +
            "GROUP BY od2.product.productId " +
            "ORDER BY COUNT(od2) DESC")
    List<Object[]> findAlsoBoughtProductIds(@Param("productId") String productId, Pageable pageable);
}

