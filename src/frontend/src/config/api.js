import axios from "axios";
import Cookies from "js-cookie";

/**
 * Axios instance tập trung cho toàn bộ API calls.
 *
 * BaseURL được đọc từ biến môi trường VITE_API_BASE_URL:
 * - Development: http://localhost:8080
 * - Production (Nginx reverse proxy): "" (rỗng)
 * - Production (separate domain): https://api.your-domain.com
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================
// REQUEST INTERCEPTOR
// Tự động gắn JWT token vào mọi request
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("jwt");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR
// Xử lý lỗi chung (401 = hết hạn token)
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      const currentPath = window.location.pathname;
      // Chỉ xóa token và redirect nếu không đang ở trang login/register
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
        Cookies.remove("jwt");
        Cookies.remove("user_id");
        Cookies.remove("user_email");
        // Không force redirect ở đây vì AuthProvider sẽ handle
      }
    }
    return Promise.reject(error);
  }
);

export default api;
