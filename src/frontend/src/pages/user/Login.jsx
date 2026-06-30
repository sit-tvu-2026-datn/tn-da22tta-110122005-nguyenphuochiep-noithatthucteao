import { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { message, Spin } from "antd";
import Cookies from "js-cookie";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import api from "../../config/api";

const LUXURY_EASE = [0.22, 1, 0.36, 1];
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const GOOGLE_LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/google`;

export default function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);
  const reduceMotion = useReducedMotion();

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
  const [errors, setErrors] = useState({ email: "", password: "", form: "" });
  const [messageApi, contextHolder] = message.useMessage();

  // ✅ Kiểm tra hợp lệ phía client
  const emailValue = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const isFormValid = emailValue !== "" && password !== "";

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

  // Xác thực các trường trước khi gửi
  const validate = () => {
    const next = { email: "", password: "", form: "" };
    if (!emailValue) next.email = "Vui lòng nhập email";
    else if (!emailValid) next.email = "Email không hợp lệ";
    if (!password) next.password = "Vui lòng nhập mật khẩu";
    return next;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // ❶ Kiểm tra phía client — chặn gửi khi rỗng / sai định dạng
    const clientErrors = validate();
    if (clientErrors.email || clientErrors.password) {
      setErrors(clientErrors);
      return;
    }

    setErrors({ email: "", password: "", form: "" });
    setLoading(true);

    try {
      // 1. Gọi API Login
      const { data } = await api.post("/api/auth/login", {
        email: emailValue,
        password,
      });

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
      // ❷ Phân loại lỗi từ máy chủ để hiển thị thông báo rõ ràng
      const code = err.response?.data?.code;
      const serverMsg = err.response?.data?.error;
      const next = { email: "", password: "", form: "" };

      if (!err.response) {
        // Mất kết nối / máy chủ không phản hồi
        next.form = "Không thể kết nối đến máy chủ. Vui lòng thử lại.";
      } else if (code === "ACCOUNT_NOT_FOUND") {
        next.email = "Tài khoản chưa được đăng ký";
      } else if (code === "WRONG_PASSWORD") {
        next.password = "Mật khẩu không chính xác";
      } else if (code === "GOOGLE_ACCOUNT") {
        next.form = serverMsg;
      } else if (code === "MISSING_FIELDS") {
        next.form = serverMsg;
      } else if (err.response.status === 401) {
        next.form = "Email hoặc mật khẩu không chính xác";
      } else {
        next.form = serverMsg || "Đăng nhập thất bại. Vui lòng thử lại.";
      }

      setErrors(next);
      messageApi.error(next.email || next.password || next.form);
      setLoading(false);
      setIsLoggingIn(false);
    }
  };

  const fade = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen flex bg-ivory font-sans text-nero">
      {contextHolder}

      {/* ─────────────────────────────────────────────
          LEFT · EDITORIAL PANEL (lg+)
          ───────────────────────────────────────────── */}
      <aside className="relative hidden lg:flex lg:w-[55%] overflow-hidden bg-nero">
        {/* Ken-burns interior image */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center motion-safe:animate-ken-burns"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2400&auto=format&fit=crop')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nero via-nero/55 to-nero/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-nero/40 via-transparent to-transparent" />
        </div>

        {/* Corner brackets — brand motif */}
        <span className="pointer-events-none absolute top-10 left-10 h-12 w-12 border-t border-l border-champagne/40" />
        <span className="pointer-events-none absolute bottom-10 right-10 h-12 w-12 border-b border-r border-champagne/40" />

        {/* Brand mark */}
        <Link
          to="/"
          className="absolute top-10 left-12 z-10 font-sans text-4xl font-extrabold uppercase tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 focus-visible:ring-offset-4 focus-visible:ring-offset-nero"
        >
          NPH <span className="text-champagne">Store</span>
        </Link>

        {/* Editorial copy */}
        <div className="relative z-10 mt-auto mb-4 p-12 xl:p-16 max-w-3xl">
          <p
            className="font-sans font-extrabold uppercase leading-[1.1] tracking-tight text-white"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
          >
            Nâng tầm
            <br />
            <span className="text-champagne">không gian sống</span>
          </p>
          <p className="mt-6 text-sm font-light tracking-wide text-white/55">
            Nội thất cao cấp · Thiết kế tối giản · Trải nghiệm đỉnh cao
          </p>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────
          RIGHT · FORM
          ───────────────────────────────────────────── */}
      <main className="relative flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[45%] lg:px-16">
        {/* Top bar: mobile brand + back link */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="font-sans text-lg font-extrabold uppercase tracking-tight text-nero lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            NPH <span className="text-champagne">Store</span>
          </Link>
          <Link
            to="/"
            className="group ml-auto inline-flex items-center gap-2 text-sm text-smoke transition-colors hover:text-nero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
          >
            <ArrowLeft
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            Trang chủ
          </Link>
        </div>

        {/* Centered form block */}
        <motion.div
          {...fade}
          transition={{ duration: 0.7, ease: LUXURY_EASE }}
          className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10"
        >
          {/* Heading */}
          <div className="mb-9">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-block h-px w-8 bg-champagne" />
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-champagne">
                Đăng nhập
              </span>
            </div>
            <h1
              className="font-sans font-extrabold uppercase leading-[1.1] tracking-tight text-nero"
              style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
            >
              Chào mừng
              <br />
              trở lại
            </h1>
          </div>

          {!isLoggingIn ? (
            <form className="space-y-7" onSubmit={handleLogin} noValidate>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-smoke"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email || errors.form)
                        setErrors((p) => ({ ...p, email: "", form: "" }));
                    }}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    placeholder="name@example.com"
                    className={`peer w-full border-0 border-b bg-transparent pb-2.5 text-[15px] text-nero placeholder-smoke/40 transition-colors focus:outline-none disabled:opacity-50 ${errors.email
                      ? "border-red-400 focus:border-red-500"
                      : "border-whisper focus:border-champagne"
                      }`}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100 ${errors.email ? "bg-red-500" : "bg-champagne"
                      }`}
                  />
                </div>
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="mt-2 text-xs text-red-600"
                  >
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2.5 flex items-baseline justify-between">
                  <label
                    htmlFor="password"
                    className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-smoke"
                  >
                    Mật khẩu
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-smoke underline-offset-4 transition-colors hover:text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password || errors.form)
                        setErrors((p) => ({ ...p, password: "", form: "" }));
                    }}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    placeholder="••••••••"
                    className={`peer w-full border-0 border-b bg-transparent pb-2.5 pr-10 text-[15px] text-nero placeholder-smoke/40 transition-colors focus:outline-none disabled:opacity-50 ${errors.password
                      ? "border-red-400 focus:border-red-500"
                      : "border-whisper focus:border-champagne"
                      }`}
                  />
                  <span
                    className={`pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100 ${errors.password ? "bg-red-500" : "bg-champagne"
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    aria-pressed={showPassword}
                    className="absolute bottom-2 right-0 text-smoke transition-colors hover:text-nero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="mt-2 text-xs text-red-600"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember */}
              <label className="group inline-flex cursor-pointer select-none items-center gap-3">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-champagne/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ivory ${remember
                    ? "border-nero bg-nero"
                    : "border-whisper bg-white group-hover:border-smoke"
                    }`}
                >
                  {remember && (
                    <Check size={12} strokeWidth={3} className="text-ivory" />
                  )}
                </span>
                <span className="text-sm text-nero">Ghi nhớ đăng nhập</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="group relative flex w-full items-center justify-center gap-2.5 bg-champagne py-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-nero transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nero focus-visible:ring-offset-2 focus-visible:ring-offset-ivory disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spin size="small" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đăng nhập
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-1">
                <span className="h-px flex-1 bg-whisper" />
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-smoke">
                  Hoặc
                </span>
                <span className="h-px flex-1 bg-whisper" />
              </div>

              {/* Google */}
              <a
                href={GOOGLE_LOGIN_URL}
                className="flex w-full items-center justify-center gap-3 border border-whisper bg-white py-3.5 text-sm font-medium text-nero transition-colors hover:border-smoke/50 hover:bg-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.96 5.96 0 0 1 8 12.557a5.96 5.96 0 0 1 5.991-5.96c1.523 0 2.9.575 3.96 1.503l3.08-3.08C19.123 3.14 16.745 2 13.991 2 8.18 2 3.5 6.7 3.5 12.5s4.68 10.5 10.491 10.5c5.783 0 9.872-3.984 9.872-9.752 0-.616-.067-1.2-.187-1.748L12.24 10.285z"
                  />
                </svg>
                Đăng nhập bằng Google
              </a>

              {/* Register */}
              <p className="pt-2 text-center text-sm text-smoke">
                Chưa có tài khoản?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-nero underline-offset-4 transition-colors hover:text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
                >
                  Tạo tài khoản mới
                </Link>
              </p>
            </form>
          ) : (
            // Success / redirecting state
            <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
              <Spin size="large" />
              <div>
                <p className="font-sans text-sm font-semibold uppercase tracking-[0.2em] text-nero">
                  Đăng nhập thành công
                </p>
                <p className="mt-2 text-sm text-smoke">
                  Đang chuyển hướng bạn vào không gian riêng…
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
