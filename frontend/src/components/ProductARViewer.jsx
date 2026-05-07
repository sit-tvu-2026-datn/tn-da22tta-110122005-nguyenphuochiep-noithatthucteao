import React, { useState } from 'react';
import '@google/model-viewer';

const ProductARViewer = ({ images = [], arModelGltf, arModelUsdz, productName }) => {
  const [activeImage, setActiveImage] = useState(images?.[0] || 'https://via.placeholder.com/500');

  React.useEffect(() => {
    setActiveImage(images?.[0] || 'https://via.placeholder.com/500');
  }, [images?.[0]]);

  // Activate model viewer AR programmatically if needed, or rely on slot="ar-button"
  return (
    <div className="flex flex-col gap-4">
      {/* 1. Ảnh lớn (Active Image) */}
      <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        <img 
          src={activeImage} 
          alt={productName} 
          className="w-full h-full object-cover transition-transform duration-300"
        />
      </div>

      {/* 2. Hàng ngang Thumbnails */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((imgUrl, index) => (
            <button
              key={index}
              onClick={() => setActiveImage(imgUrl)}
              className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                activeImage === imgUrl ? 'border-blue-600 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={imgUrl} alt={`${productName} thumbnail ${index}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* 3. Nút AR và Model Viewer */}
      {(arModelGltf || arModelUsdz) && (
        <div className="mt-4">
          <model-viewer
             src={arModelGltf}
             ios-src={arModelUsdz}
             ar
             ar-modes="webxr scene-viewer quick-look"
             camera-controls
             alt={productName}
             style={{ width: '100%', height: '300px', backgroundColor: '#f9fafb', borderRadius: '0.75rem', display: 'none' }} // Ẩn trình xem 3D web nếu chỉ muốn AR, nhưng model-viewer mặc định cần hiển thị để bấm nút. Sửa lại: hiển thị 3D cho user xoay, kèm nút AR.
          >
             {/* Tuỳ biến hiển thị model-viewer trên web nếu muốn, ở đây hiển thị box 3D */}
          </model-viewer>

          {/* Render box 3D luôn để user xoay xem, tích hợp nút AR vào bên trong */}
          <div className="relative w-full aspect-video bg-gray-100 rounded-xl overflow-hidden mt-4 border border-gray-200 flex items-center justify-center">
             <model-viewer
                src={arModelGltf}
                ios-src={arModelUsdz}
                ar
                ar-modes="webxr scene-viewer quick-look"
                camera-controls
                auto-rotate
                alt={productName}
                style={{ width: '100%', height: '100%', outline: 'none' }}
             >
                <button 
                  slot="ar-button" 
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all text-sm md:text-base border-none cursor-pointer flex items-center gap-2 z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" y1="22" x2="12" y2="12"></line></svg>
                  Xem trong phòng của bạn (AR)
                </button>
             </model-viewer>
             {/* Chỉ báo kéo thả 3D */}
             <div className="absolute top-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                Chạm để xoay 3D
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductARViewer;
