/**
 * NGUỒN CÔNG THỨC GIÁ DUY NHẤT CHO TOÀN HỆ THỐNG.
 *
 * Mọi nơi hiển thị / tính giá (Trang chủ, Danh sách, Chi tiết SP, Giỏ hàng,
 * Thanh toán, Đơn hàng của tôi, Chi tiết đơn, Admin) PHẢI dùng các hàm ở đây,
 * không được tự tính mỗi nơi một kiểu.
 *
 * Công thức chuẩn:
 *   finalPrice = price - (price * discountPercent / 100)
 * Nếu sản phẩm đang trong Flash Sale còn suất -> finalPrice = flashSalePrice.
 */

/** Định dạng tiền VND, ví dụ 5617500 -> "5.617.500₫" */
export const formatPrice = (value) =>
  `${new Intl.NumberFormat("vi-VN").format(Math.round(Number(value || 0)))}₫`;

/**
 * Tính thông tin giá "sống" của một sản phẩm (dựa trên giá & discount hiện tại
 * + flash sale hiện hành). Dùng cho: danh sách SP, chi tiết SP, giỏ hàng, mua ngay.
 *
 * @param {object} product  - Sản phẩm (có price, discount, quantity...)
 * @param {object|null} flashSale - Flash sale hiện hành (có items[])
 * @returns {{
 *   finalPrice:number, originalPrice:number, discountPercent:number,
 *   discountAmount:number, isFlashSale:boolean, maxAvailable:number,
 *   fsQuantity:number, fsSold:number
 * }}
 */
export function getProductPriceInfo(product, flashSale) {
  if (!product) {
    return {
      finalPrice: 0,
      originalPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      isFlashSale: false,
      maxAvailable: 0,
      fsQuantity: 0,
      fsSold: 0,
    };
  }

  const originalPrice = Number(product.price || 0);

  // 1) Ưu tiên Flash Sale nếu còn suất
  if (flashSale?.items) {
    const fsItem = flashSale.items.find(
      (item) => item.productId === product.productId
    );
    if (fsItem && fsItem.soldCount < fsItem.quantity) {
      const finalPrice = Number(fsItem.flashSalePrice || 0);
      return {
        finalPrice,
        originalPrice,
        discountPercent:
          originalPrice > 0
            ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
            : 0,
        discountAmount: Math.max(originalPrice - finalPrice, 0),
        isFlashSale: true,
        maxAvailable: fsItem.quantity - fsItem.soldCount,
        fsQuantity: fsItem.quantity,
        fsSold: fsItem.soldCount,
      };
    }
  }

  // 2) Giảm giá phần trăm theo sản phẩm
  const discountPercent = Number(product.discount || 0);
  const finalPrice =
    discountPercent > 0
      ? originalPrice * (1 - discountPercent / 100)
      : originalPrice;

  return {
    finalPrice,
    originalPrice,
    discountPercent,
    discountAmount: Math.max(originalPrice - finalPrice, 0),
    isFlashSale: false,
    maxAvailable: Number(product.quantity || 0),
    fsQuantity: 0,
    fsSold: 0,
  };
}

/**
 * Tính thông tin giá của một dòng ĐÃ CHỐT trong đơn hàng (OrderDetail).
 * Dùng giá đã "đóng băng" tại thời điểm đặt hàng để đơn cũ luôn đúng
 * dù sau này sản phẩm đổi giá.
 *
 * Backend trả: unitPrice (giá sau giảm), originalUnitPrice (giá gốc),
 * và có thể kèm finalPrice/discountPercent (derived).
 *
 * @param {object} item - OrderDetail DTO
 */
export function getOrderItemPriceInfo(item) {
  const finalPrice = Number(item?.unitPrice ?? item?.finalPrice ?? item?.originalUnitPrice ?? 0);
  const originalPrice = Number(item?.originalUnitPrice ?? item?.unitPrice ?? finalPrice);
  const quantity = Number(item?.quantity || 0);
  const hasDiscount = originalPrice > finalPrice;

  return {
    finalPrice,
    originalPrice,
    quantity,
    hasDiscount,
    discountPercent:
      hasDiscount && originalPrice > 0
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0,
    discountAmount: Math.max(originalPrice - finalPrice, 0),
    subtotal: finalPrice * quantity,
  };
}
