import React from "react";

/**
 * Component hiển thị hiệu ứng nạp dữ liệu (Skeleton Loading)
 * cho các phần gợi ý sản phẩm cá nhân hóa.
 * Thiết kế theo phong cách tối giản và cao cấp nhất quán với website.
 */
export default function RecommendationSkeleton({ count = 4 }) {
  return (
    <div className="mx-auto max-w-[1420px] px-5 py-12 sm:px-8">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/45 p-3 shadow-[0_18px_60px_rgba(74,58,39,0.08)] backdrop-blur-md"
          >
            {/* Ảnh Placeholder */}
            <div className="aspect-[4/5] w-full animate-pulse rounded-[1.25rem] bg-[#ede8df]" />
            
            {/* Nội dung text Placeholder */}
            <div className="mt-4 flex flex-grow flex-col gap-3.5 px-2 pb-2">
              {/* Tên sản phẩm */}
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-[#ede8df]" />
              
              {/* Danh mục */}
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-[#ede8df]" />

              <div className="mt-auto pt-4 flex items-center justify-between">
                {/* Giá tiền */}
                <div className="h-5 w-1/3 animate-pulse rounded-full bg-[#ede8df]" />
                
                {/* Nút giỏ hàng */}
                <div className="h-10 w-10 animate-pulse rounded-full bg-[#ede8df]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
