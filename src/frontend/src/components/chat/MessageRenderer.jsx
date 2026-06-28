import ProductCarousel from "./ProductCarousel";
import ProductDetailCard from "./ProductDetailCard";

const TYPE_PRODUCT_RECOMMENDATION = "product_recommendation";
const TYPE_PRODUCT_DETAIL = "product_detail";

const bubbleClass =
  "max-w-[88%] self-start rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-3.5 text-[14px] leading-relaxed text-gray-800 shadow-sm break-words";

const renderTextLines = (text) =>
  String(text || "")
    .split("\n")
    .map((line, index) =>
      line.trim() ? (
        <p key={index} className="mb-1 last:mb-0">
          {line}
        </p>
      ) : (
        <span key={index} className="block h-2" aria-hidden="true" />
      ),
    );

/**
 * Render một tin nhắn bot theo `type` (switch theo loại).
 *
 * - "text"                  -> bong bóng chat văn bản thuần.
 * - "product_recommendation"-> bong bóng tư vấn + ProductCarousel.
 *
 * Hỗ trợ cả tin nhắn dạng cũ (chỉ có `text`) lẫn dạng mới (`message`).
 * Không parse text để tìm link, không regex URL, không render HTML từ AI.
 */
export default function MessageRenderer({ message, onNavigate }) {
  if (!message) return null;

  const text = message.message ?? message.text ?? "";

  if (message.type === TYPE_PRODUCT_RECOMMENDATION) {
    return (
      <div className="flex w-full flex-col">
        {text && (
          <div className={bubbleClass}>
            <div>{renderTextLines(text)}</div>
          </div>
        )}
        <ProductCarousel
          products={message.products || []}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  if (message.type === TYPE_PRODUCT_DETAIL) {
    const product = (message.products || [])[0];
    return (
      <div className="flex w-full flex-col">
        {text && (
          <div className={bubbleClass}>
            <div>{renderTextLines(text)}</div>
          </div>
        )}
        {product && (
          <ProductDetailCard product={product} onNavigate={onNavigate} />
        )}
      </div>
    );
  }

  // Mặc định: type === "text"
  return (
    <div className={bubbleClass}>
      <div>{renderTextLines(text)}</div>
    </div>
  );
}
