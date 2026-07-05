package com.example.backend.service;

import com.example.backend.config.BrevoConfig;
import com.example.backend.model.Order;
import com.example.backend.model.OrderDetail;
import com.example.backend.model.Product;
import com.example.backend.model.ProductImage;
import com.example.backend.model.User;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Chịu trách nhiệm dựng toàn bộ HTML của email xác nhận đơn hàng.
 *
 * Yêu cầu thiết kế:
 *  - HTML thuần + inline CSS (tương thích Gmail, Outlook, Apple Mail, Yahoo Mail).
 *  - Layout table-based để hiển thị ổn định trên mọi email client.
 *  - Màu chủ đạo #C58C5D, nền trắng, bo góc, shadow, responsive.
 *
 * KHÔNG viết HTML trong Controller/Service gọi API — toàn bộ nằm ở builder này.
 */
@Component
public class EmailTemplateBuilder {

    private static final String BRAND = "#C58C5D";
    private static final String BRAND_DARK = "#A9733F";
    private static final String TEXT_DARK = "#2B2B2B";
    private static final String TEXT_MUTED = "#7A7A7A";
    private static final String BORDER = "#EDE6DE";
    private static final String BG = "#F4F1EC";
    private static final String RED = "#E23744";
    private static final String PLACEHOLDER_IMG =
            "https://placehold.co/120x120/F4F1EC/C58C5D?text=Interior";

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /**
     * Dựng HTML email xác nhận đơn hàng.
     *
     * @param order             đơn hàng (kèm orderDetails đã được load trong transaction)
     * @param user              chủ đơn (để lấy email/tên/điện thoại fallback)
     * @param paymentMethodName tên phương thức thanh toán hiển thị
     * @param cfg               cấu hình Brevo (chứa URL frontend + thông tin liên hệ)
     */
    public String buildOrderConfirmation(Order order, User user, String paymentMethodName, BrevoConfig cfg) {
        // --- Parse thông tin khách hàng từ shippingAddress ("Tên - SĐT - Địa chỉ") ---
        String rawAddress = order.getShippingAddress() != null ? order.getShippingAddress() : "";
        String[] parts = rawAddress.split(" - ", 3);
        String customerName = orDefault(part(parts, 0), user != null ? user.getFullName() : "Quý khách");
        String customerPhone = orDefault(part(parts, 1), user != null ? user.getPhoneNumber() : "—");
        String customerAddress = orDefault(part(parts, 2), rawAddress.isBlank() ? "—" : rawAddress);
        String customerEmail = user != null && user.getEmail() != null ? user.getEmail() : "—";

        String orderDate = order.getOrderDate() != null ? order.getOrderDate().format(DATE_FMT) : "—";

        // --- Tính toán tổng tiền ---
        BigDecimal itemsTotal = BigDecimal.ZERO;
        if (order.getOrderDetails() != null) {
            for (OrderDetail d : order.getOrderDetails()) {
                itemsTotal = itemsTotal.add(lineTotal(d));
            }
        }
        BigDecimal shippingFee = order.getShippingFee() != null ? order.getShippingFee() : BigDecimal.ZERO;
        BigDecimal totalPayment = order.getTotalAmount() != null ? order.getTotalAmount() : itemsTotal;
        // Giảm giá voucher = (tiền hàng + ship) - tổng thanh toán (không âm)
        BigDecimal couponDiscount = itemsTotal.add(shippingFee).subtract(totalPayment).max(BigDecimal.ZERO);

        String viewOrderUrl = cfg.getFrontendUrl() + "/purchase";
        String homeUrl = cfg.getFrontendUrl();

        StringBuilder productRows = new StringBuilder();
        if (order.getOrderDetails() != null) {
            for (OrderDetail d : order.getOrderDetails()) {
                productRows.append(buildProductCard(d));
            }
        }

        // ================= HTML =================
        return """
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Xác nhận đơn hàng</title>
</head>
<body style="margin:0; padding:0; background-color:%s; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:%s; padding:24px 12px;">
<tr>
<td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.08);">

  <!-- ===== HEADER ===== -->
  <tr>
    <td style="background:linear-gradient(135deg,%s,%s); padding:40px 32px; text-align:center;">
      <div style="display:inline-block; background-color:rgba(255,255,255,0.15); border-radius:999px; padding:8px 20px; margin-bottom:16px;">
        <span style="color:#FFFFFF; font-size:15px; font-weight:600; letter-spacing:2px;">🛋️ INTERIOR SHOP</span>
      </div>
      <h1 style="margin:8px 0 6px; color:#FFFFFF; font-size:26px; font-weight:700;">🎉 Cảm ơn bạn đã mua hàng!</h1>
      <p style="margin:0; color:#FDF6EF; font-size:15px;">Đơn hàng của bạn đã được xác nhận thành công.</p>
    </td>
  </tr>

  <!-- ===== THÔNG TIN KHÁCH HÀNG ===== -->
  <tr>
    <td style="padding:28px 32px 8px;">
      %s
    </td>
  </tr>

  <!-- ===== DANH SÁCH SẢN PHẨM ===== -->
  <tr>
    <td style="padding:12px 32px 8px;">
      <h2 style="margin:0 0 16px; font-size:17px; color:%s; font-weight:700;">🛍️ Sản phẩm đã đặt</h2>
      %s
    </td>
  </tr>

  <!-- ===== TỔNG TIỀN ===== -->
  <tr>
    <td style="padding:8px 32px 12px;">
      %s
    </td>
  </tr>

  <!-- ===== NÚT HÀNH ĐỘNG ===== -->
  <tr>
    <td style="padding:12px 32px 28px; text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center">
        <tr>
          <td style="padding:6px;">
            <a href="%s" style="display:inline-block; background:linear-gradient(135deg,%s,%s); color:#FFFFFF; text-decoration:none; font-size:15px; font-weight:600; padding:14px 30px; border-radius:10px; box-shadow:0 4px 12px rgba(197,140,93,0.35);">Xem đơn hàng</a>
          </td>
          <td style="padding:6px;">
            <a href="%s" style="display:inline-block; background-color:#FFFFFF; color:%s; text-decoration:none; font-size:15px; font-weight:600; padding:14px 30px; border-radius:10px; border:2px solid %s;">Về trang chủ</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- ===== FOOTER ===== -->
  <tr>
    <td style="background-color:#FBF8F4; padding:28px 32px; text-align:center; border-top:1px solid %s;">
      <p style="margin:0 0 6px; font-size:15px; color:%s; font-weight:600;">Cảm ơn bạn đã tin tưởng Interior Shop 💛</p>
      <p style="margin:0 0 16px; font-size:13px; color:%s;">Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
      <p style="margin:0; font-size:13px; color:%s; line-height:1.9;">
        📞 Hotline: <strong style="color:%s;">%s</strong><br>
        ✉️ Email: <a href="mailto:%s" style="color:%s; text-decoration:none;">%s</a><br>
        📘 Facebook: <a href="%s" style="color:%s; text-decoration:none;">Interior Shop</a><br>
        🌐 Website: <a href="%s" style="color:%s; text-decoration:none;">%s</a>
      </p>
      <p style="margin:18px 0 0; font-size:11px; color:#B7ADA1;">© 2026 Interior Shop. All rights reserved.</p>
    </td>
  </tr>

</table>

</td>
</tr>
</table>
</body>
</html>
""".formatted(
                BG, BG,
                BRAND, BRAND_DARK,
                buildCustomerInfo(customerName, customerEmail, customerPhone, customerAddress,
                        order.getOrderId(), orderDate, paymentMethodName),
                TEXT_DARK,
                productRows.toString(),
                buildTotals(itemsTotal, couponDiscount, shippingFee, totalPayment),
                viewOrderUrl, BRAND, BRAND_DARK,
                homeUrl, BRAND_DARK, BRAND,
                BORDER,
                TEXT_DARK,
                TEXT_MUTED,
                TEXT_MUTED,
                BRAND_DARK, escape(cfg.getShopHotline()),
                escape(cfg.getShopEmail()), BRAND_DARK, escape(cfg.getShopEmail()),
                escape(cfg.getShopFacebook()), BRAND_DARK,
                escape(cfg.getShopWebsite()), BRAND_DARK, escape(cfg.getShopWebsite())
        );
    }

    // ---------- Khối thông tin khách hàng ----------
    private String buildCustomerInfo(String name, String email, String phone, String address,
                                     String orderId, String orderDate, String paymentMethod) {
        String row = """
          <tr>
            <td style="padding:7px 0; font-size:13px; color:%s; width:150px; vertical-align:top;">%s</td>
            <td style="padding:7px 0; font-size:13px; color:%s; font-weight:600; vertical-align:top;">%s</td>
          </tr>""";
        String rows =
                row.formatted(TEXT_MUTED, "👤 Khách hàng", TEXT_DARK, escape(name)) +
                row.formatted(TEXT_MUTED, "✉️ Email", TEXT_DARK, escape(email)) +
                row.formatted(TEXT_MUTED, "📞 Số điện thoại", TEXT_DARK, escape(phone)) +
                row.formatted(TEXT_MUTED, "📍 Địa chỉ", TEXT_DARK, escape(address)) +
                row.formatted(TEXT_MUTED, "🧾 Mã đơn hàng", BRAND_DARK, escape(orderId)) +
                row.formatted(TEXT_MUTED, "🗓️ Ngày đặt", TEXT_DARK, escape(orderDate)) +
                row.formatted(TEXT_MUTED, "💳 Thanh toán", TEXT_DARK, escape(paymentMethod));

        return """
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#FBF8F4; border:1px solid %s; border-radius:12px; padding:8px 20px;">
%s
</table>""".formatted(BORDER, rows);
    }

    // ---------- Card sản phẩm ----------
    private String buildProductCard(OrderDetail d) {
        Product p = d.getProduct();
        String name = p != null && p.getProductName() != null ? p.getProductName() : "Sản phẩm";
        String img = firstImage(p);

        BigDecimal finalPrice = d.getUnitPrice() != null ? d.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal original = d.getOriginalUnitPrice() != null ? d.getOriginalUnitPrice() : finalPrice;
        boolean hasDiscount = original.compareTo(finalPrice) > 0;
        int percent = 0;
        if (hasDiscount && original.compareTo(BigDecimal.ZERO) > 0) {
            percent = original.subtract(finalPrice)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(original, 0, RoundingMode.HALF_UP)
                    .intValue();
        }

        // Khối giá (có/không giảm)
        String priceBlock;
        if (hasDiscount) {
            priceBlock = """
              <span style="font-size:12px; color:%s; text-decoration:line-through;">%s</span>
              <span style="display:inline-block; background-color:#FDECEC; color:%s; font-size:11px; font-weight:700; padding:2px 7px; border-radius:6px; margin-left:6px;">-%d%%</span>
              <br>
              <span style="font-size:16px; color:%s; font-weight:700;">%s</span>"""
                    .formatted(TEXT_MUTED, money(original), RED, percent, RED, money(finalPrice));
        } else {
            priceBlock = "<span style=\"font-size:16px; color:%s; font-weight:700;\">%s</span>"
                    .formatted(TEXT_DARK, money(finalPrice));
        }

        return """
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border:1px solid %s; border-radius:12px; margin-bottom:14px;">
  <tr>
    <td style="padding:14px; width:96px; vertical-align:top;">
      <img src="%s" alt="%s" width="80" height="80" style="width:80px; height:80px; border-radius:10px; object-fit:cover; display:block; border:1px solid %s; background-color:%s;">
    </td>
    <td style="padding:14px 14px 14px 0; vertical-align:top;">
      <p style="margin:0 0 6px; font-size:14px; color:%s; font-weight:600; line-height:1.4;">%s</p>
      <div style="margin:0 0 6px;">%s</div>
      <p style="margin:0; font-size:12px; color:%s;">Số lượng: <strong style="color:%s;">%d</strong></p>
    </td>
    <td style="padding:14px; vertical-align:top; text-align:right; white-space:nowrap;">
      <p style="margin:0 0 4px; font-size:11px; color:%s; text-transform:uppercase; letter-spacing:0.5px;">Thành tiền</p>
      <p style="margin:0; font-size:16px; color:%s; font-weight:700;">%s</p>
    </td>
  </tr>
</table>""".formatted(
                BORDER,
                img, escape(name), BORDER, BG,
                TEXT_DARK, escape(name),
                priceBlock,
                TEXT_MUTED, TEXT_DARK, d.getQuantity(),
                TEXT_MUTED,
                BRAND_DARK, money(lineTotal(d))
        );
    }

    // ---------- Khối tổng tiền ----------
    private String buildTotals(BigDecimal itemsTotal, BigDecimal discount,
                               BigDecimal shippingFee, BigDecimal totalPayment) {
        String line = """
          <tr>
            <td style="padding:6px 0; font-size:14px; color:%s;">%s</td>
            <td style="padding:6px 0; font-size:14px; color:%s; text-align:right; font-weight:600;">%s</td>
          </tr>""";

        String shippingText = shippingFee.compareTo(BigDecimal.ZERO) == 0
                ? "<span style=\"color:#2E9E5B; font-weight:600;\">Miễn phí</span>"
                : money(shippingFee);

        StringBuilder rows = new StringBuilder();
        rows.append(line.formatted(TEXT_MUTED, "Tổng tiền hàng", TEXT_DARK, money(itemsTotal)));
        if (discount.compareTo(BigDecimal.ZERO) > 0) {
            rows.append(line.formatted(TEXT_MUTED, "Giảm giá",
                    "#2E9E5B", "-" + money(discount)));
        }
        rows.append(line.formatted(TEXT_MUTED, "Phí vận chuyển", TEXT_DARK, shippingText));

        return """
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#FBF8F4; border:1px solid %s; border-radius:12px; padding:8px 20px;">
%s
  <tr><td colspan="2" style="padding:4px 0;"><div style="border-top:1px dashed %s;"></div></td></tr>
  <tr>
    <td style="padding:10px 0 6px; font-size:16px; color:%s; font-weight:700;">Tổng thanh toán</td>
    <td style="padding:10px 0 6px; font-size:24px; color:%s; text-align:right; font-weight:800;">%s</td>
  </tr>
</table>""".formatted(BORDER, rows.toString(), BORDER, TEXT_DARK, RED, money(totalPayment));
    }

    // ---------- Helpers ----------
    private BigDecimal lineTotal(OrderDetail d) {
        BigDecimal price = d.getUnitPrice() != null ? d.getUnitPrice() : BigDecimal.ZERO;
        return price.multiply(BigDecimal.valueOf(d.getQuantity()));
    }

    private String firstImage(Product p) {
        if (p != null) {
            List<ProductImage> imgs = p.getImages();
            if (imgs != null && !imgs.isEmpty() && imgs.get(0) != null && imgs.get(0).getUrl() != null
                    && !imgs.get(0).getUrl().isBlank()) {
                return escape(imgs.get(0).getUrl());
            }
        }
        return PLACEHOLDER_IMG;
    }

    /** Định dạng tiền VND: 5617500 -> "5.617.500đ". */
    private String money(BigDecimal value) {
        if (value == null) value = BigDecimal.ZERO;
        long v = value.setScale(0, RoundingMode.HALF_UP).longValue();
        return String.format("%,d", v).replace(',', '.') + "đ";
    }

    private String part(String[] arr, int i) {
        return (arr != null && arr.length > i && arr[i] != null) ? arr[i].trim() : "";
    }

    private String orDefault(String value, String fallback) {
        return (value == null || value.isBlank())
                ? (fallback == null || fallback.isBlank() ? "—" : fallback)
                : value;
    }

    /** Escape ký tự HTML để tránh vỡ layout / injection từ dữ liệu người dùng. */
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
