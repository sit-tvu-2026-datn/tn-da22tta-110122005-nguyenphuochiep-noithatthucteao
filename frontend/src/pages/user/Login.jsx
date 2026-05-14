import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { message, Spin } from "antd";
import Cookies from "js-cookie";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, LogIn } from "lucide-react";
import api from "../../config/api";

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);

  // 🧠 Logic giữ nguyên
  const initialEmail =
    location.state?.email || localStorage.getItem("rememberEmail") || "";
  const initialPassword = location.state?.password || "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [remember, setRemember] = useState(
    !!localStorage.getItem("rememberEmail")
  );
  const [loading, setLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false); // Trạng thái đang xử lý đăng nhập thành công
  const [showPassword, setShowPassword] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // ✅ Cập nhật: Logic điều hướng tự động khi đã có user (F5 trang)
  useEffect(() => {
    // Chỉ redirect nếu user đã tồn tại và không phải đang trong quá trình login (để tránh conflict logic)
    if (user && !isLoggingIn) {
      if (user.role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [user, navigate, isLoggingIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Gọi API Login
      const { data } = await api.post("/api/auth/login", { email, password });

      const token = data.token;
      if (!token) throw new Error("Phản hồi không hợp lệ từ máy chủ");

      // 2. Xử lý Ghi nhớ & Cookie
      if (remember) localStorage.setItem("rememberEmail", email);
      else localStorage.removeItem("rememberEmail");

      Cookies.set("jwt", token, {
        expires: 1 / 24, // 1 giờ
        secure: false,
        sameSite: "Lax",
      });

      // 3. Chuyển sang giao diện Loading thành công
      setIsLoggingIn(true);
      messageApi.success("Đăng nhập thành công!");

      // 4. Lấy thông tin user để kiểm tra Role NGAY LẬP TẨC
      // Chúng ta fetch trực tiếp ở đây để quyết định hướng đi chính xác
      const profileRes = await api.get("/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = profileRes.data;
      
      // Cập nhật Context
      await login(userData, token);

      // 5. Đợi 1 chút để người dùng thấy thông báo rồi điều hướng dựa trên ROLE
      setTimeout(() => {
        if (userData && userData.role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      }, 1000);

    } catch (err) {
      messageApi.error(err.message || "Đăng nhập thất bại");
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans">
      {/* contextHolder để hiển thị message */}
      {contextHolder}

      {/* --- CỘT TRÁI: ẢNH BRANDING (Ẩn trên Mobile) --- */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop"
            alt="Furniture Background"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80"></div>
        </div>

        {/* Branding Content */}
        <div className="relative z-10 text-white p-12 max-w-lg">
          <h1 className="text-5xl font-extrabold mb-6 tracking-tight">
            NPH <span className="text-blue-500">STORE</span>
          </h1>
          <p className="text-lg text-gray-200 leading-relaxed mb-8">
            Khám phá bộ sưu tập nội thất đẳng cấp, kiến tạo không gian sống mơ
            ước của bạn với những thiết kế tinh tế nhất.
          </p>
        </div>
      </div>

      {/* --- CỘT PHẢI: FORM LOGIN --- */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        {/* Nút Back Home */}
        <Link
          to="/"
          className="absolute top-6 left-6 md:top-10 md:left-10 text-gray-500 hover:text-gray-900 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft size={20} />{" "}
          <span className="text-sm font-medium">Trang chủ</span>
        </Link>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Chào mừng trở lại! 👋
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Vui lòng nhập thông tin đăng nhập của bạn để tiếp tục.
            </p>
          </div>

          {!isLoggingIn ? (
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-5">
                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      required
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={loading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all sm:text-sm"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Mật khẩu
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900 cursor-pointer select-none"
                >
                  Ghi nhớ đăng nhập
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all transform hover:-translate-y-0.5 ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <Spin size="small" className="mr-2 custom-spin-white" />
                ) : (
                  <LogIn size={18} className="mr-2" />
                )}
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <Spin size="large" />
              <p className="text-gray-500">Đang chuyển hướng...</p>
            </div>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Chưa có tài khoản?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đăng ký tài khoản mới
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}