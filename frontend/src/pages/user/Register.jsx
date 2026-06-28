import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { message } from "antd";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import api from "../../config/api";

const LUXURY_EASE = [0.22, 1, 0.36, 1];

const DEFAULT_AVATAR =
  "https://res.cloudinary.com/ddnzj70uw/image/upload/v1759990027/avt-default_r2kgze.png";

// Style helpers — hairline input shared with the login page
const labelCls =
  "font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-smoke";
const inputCls = (error) =>
  `peer w-full border-0 border-b bg-transparent pb-2.5 text-[15px] text-nero placeholder-smoke/40 transition-colors focus:outline-none disabled:opacity-50 ${error
    ? "border-red-400 focus:border-red-500"
    : "border-whisper focus:border-champagne"
  }`;
const underlineCls = (error) =>
  `pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100 ${error ? "bg-red-500" : "bg-champagne"
  }`;

export default function Register() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rePassword: "",
    fullName: "",
    phone: "",
    address: "",
    gender: "Nam",
    avatar: null,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    rePassword: "",
    form: "",
  });
  const [preview, setPreview] = useState(DEFAULT_AVATAR);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // ✅ Kiểm tra hợp lệ phía client
  const emailValue = formData.email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const phoneValue = formData.phone.trim();
  const phoneValid = phoneValue === "" || /^0\d{9}$/.test(phoneValue);
  const isFormValid =
    formData.fullName.trim() !== "" &&
    emailValue !== "" &&
    emailValid &&
    formData.password.length >= 6 &&
    formData.rePassword !== "" &&
    formData.password === formData.rePassword &&
    phoneValid;

  const validate = () => {
    const next = {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      rePassword: "",
      form: "",
    };
    if (!formData.fullName.trim()) next.fullName = "Vui lòng nhập họ và tên";
    if (!emailValue) next.email = "Vui lòng nhập email";
    else if (!emailValid) next.email = "Email không hợp lệ";
    if (!phoneValid) next.phone = "Số điện thoại không hợp lệ";
    if (!formData.password) next.password = "Vui lòng nhập mật khẩu";
    else if (formData.password.length < 6)
      next.password = "Mật khẩu phải có ít nhất 6 ký tự";
    if (!formData.rePassword) next.rePassword = "Vui lòng nhập lại mật khẩu";
    else if (formData.password !== formData.rePassword)
      next.rePassword = "Mật khẩu nhập lại không khớp";
    return next;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({
      ...p,
      [name]: "",
      ...(name === "password" ? { rePassword: "" } : {}),
      form: "",
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, avatar: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ❶ Kiểm tra phía client — chặn gửi khi rỗng / sai định dạng
    const clientErrors = validate();
    const hasError = Object.entries(clientErrors).some(
      ([k, v]) => k !== "form" && v
    );
    if (hasError) {
      setErrors(clientErrors);
      return;
    }

    setErrors({
      fullName: "",
      email: "",
      phone: "",
      password: "",
      rePassword: "",
      form: "",
    });
    setLoading(true);

    try {
      let avatarUrl = DEFAULT_AVATAR;

      if (formData.avatar) {
        const data = new FormData();
        data.append("file", formData.avatar);
        data.append("upload_preset", "my_interior_shop");

        const resUpload = await fetch(
          "https://api.cloudinary.com/v1_1/ddnzj70uw/image/upload",
          {
            method: "POST",
            body: data,
          }
        );

        const uploadResult = await resUpload.json();
        avatarUrl = uploadResult.secure_url;
      }

      const payload = {
        fullName: formData.fullName,
        email: emailValue,
        password: formData.password,
        phone_number: formData.phone,
        address: formData.address,
        gender: formData.gender,
        avatar: avatarUrl,
      };

      const { data } = await api.post("/api/auth/register", payload);

      if (data.message) {
        messageApi.success("Đăng ký thành công!");
        setTimeout(() => {
          navigate("/login", {
            state: {
              email: emailValue,
              password: formData.password,
            },
          });
        }, 1500);
      } else if (data.error) {
        if (data.error.includes("exists")) {
          setErrors((p) => ({ ...p, email: "Email đã được sử dụng" }));
          messageApi.error("Email đã được sử dụng, vui lòng chọn email khác!");
        } else {
          messageApi.error("Đăng ký thất bại: " + data.error);
        }
        setLoading(false);
      } else {
        messageApi.error("Có lỗi xảy ra, vui lòng thử lại!");
        setLoading(false);
      }
    } catch (error) {
      // ❷ Phân loại lỗi từ máy chủ
      const serverErr = error.response?.data?.error;
      if (serverErr?.includes("exists")) {
        setErrors((p) => ({ ...p, email: "Email đã được sử dụng" }));
        messageApi.error("Email đã được sử dụng, vui lòng chọn email khác!");
      } else if (!error.response) {
        messageApi.error("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      } else {
        messageApi.error(serverErr || "Đăng ký thất bại. Vui lòng thử lại.");
      }
      setLoading(false);
    }
  };

  const fade = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen flex bg-ivory font-sans text-nero">
      {contextHolder}

      {/* ─────────────────────────────────────────────
          LEFT · EDITORIAL PANEL (lg+, sticky)
          ───────────────────────────────────────────── */}
      <aside className="relative hidden lg:flex lg:w-[45%] overflow-hidden bg-nero lg:sticky lg:top-0 lg:h-screen">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 bg-cover bg-center motion-safe:animate-ken-burns"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2400&auto=format&fit=crop')",
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
        <div className="relative z-10 mt-auto p-12 xl:p-16 max-w-xl">
          <p
            className="font-sans font-extrabold uppercase leading-[1.1] tracking-tight text-white"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
          >
            Sống cùng
            <br />
            <span className="text-champagne">không gian đẹp</span>
          </p>
          <p className="mt-6 text-sm font-light tracking-wide text-white/55">
            Ưu đãi riêng · Theo dõi đơn hàng · Lưu thiết kế của bạn
          </p>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────
          RIGHT · FORM
          ───────────────────────────────────────────── */}
      <main className="relative flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[55%] lg:px-16">
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

        {/* Form block */}
        <motion.div
          {...fade}
          transition={{ duration: 0.7, ease: LUXURY_EASE }}
          className="mx-auto w-full max-w-[480px] py-10"
        >
          {/* Heading */}
          <div className="mb-9">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-block h-px w-8 bg-champagne" />
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.3em] text-champagne">
                Đăng ký
              </span>
            </div>
            <h1
              className="font-sans font-extrabold uppercase leading-[1.05] tracking-tight text-nero"
              style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
            >
              Tạo tài khoản
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-smoke">
              Nhập thông tin của bạn để bắt đầu hành trình kiến tạo không gian.
            </p>
          </div>

          <form className="space-y-7" onSubmit={handleSubmit} noValidate>
            {/* Avatar */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleAvatarClick}
                className="group relative h-24 w-24 overflow-hidden rounded-full ring-1 ring-whisper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
                aria-label="Chọn ảnh đại diện"
              >
                <img
                  src={preview}
                  alt="Ảnh đại diện"
                  className="h-full w-full object-cover transition-opacity group-hover:opacity-70"
                />
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-nero/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera size={20} className="text-white" />
                  <span className="text-[10px] font-medium uppercase tracking-wide text-white">
                    Đổi ảnh
                  </span>
                </span>
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                ref={fileInputRef}
                className="hidden"
              />
            </div>

            {/* Full name */}
            <div>
              <label htmlFor="fullName" className={`mb-2.5 block ${labelCls}`}>
                Họ và tên
              </label>
              <div className="relative">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  disabled={loading}
                  value={formData.fullName}
                  onChange={handleChange}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={
                    errors.fullName ? "fullName-error" : undefined
                  }
                  placeholder="Nguyễn Văn A"
                  className={inputCls(errors.fullName)}
                />
                <span className={underlineCls(errors.fullName)} />
              </div>
              {errors.fullName && (
                <p
                  id="fullName-error"
                  role="alert"
                  className="mt-2 text-xs text-red-600"
                >
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={`mb-2.5 block ${labelCls}`}>
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  placeholder="name@example.com"
                  className={inputCls(errors.email)}
                />
                <span className={underlineCls(errors.email)} />
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

            {/* Phone + Gender */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2">
              <div>
                <label htmlFor="phone" className={`mb-2.5 block ${labelCls}`}>
                  Số điện thoại
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    disabled={loading}
                    value={formData.phone}
                    onChange={handleChange}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    placeholder="09xxxxxxxx"
                    className={inputCls(errors.phone)}
                  />
                  <span className={underlineCls(errors.phone)} />
                </div>
                {errors.phone && (
                  <p
                    id="phone-error"
                    role="alert"
                    className="mt-2 text-xs text-red-600"
                  >
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="gender" className={`mb-2.5 block ${labelCls}`}>
                  Giới tính
                </label>
                <div className="relative">
                  <select
                    id="gender"
                    name="gender"
                    disabled={loading}
                    value={formData.gender}
                    onChange={handleChange}
                    className="peer w-full appearance-none border-0 border-b border-whisper bg-transparent pb-2.5 pr-6 text-[15px] text-nero transition-colors focus:border-champagne focus:outline-none disabled:opacity-50"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                  <span className={underlineCls(false)} />
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute bottom-2.5 right-0 text-smoke"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className={`mb-2.5 block ${labelCls}`}>
                Địa chỉ
              </label>
              <div className="relative">
                <input
                  id="address"
                  name="address"
                  type="text"
                  disabled={loading}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Số 123, Đường ABC…"
                  className={inputCls(false)}
                />
                <span className={underlineCls(false)} />
              </div>
            </div>

            {/* Password + Re-password */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="password"
                  className={`mb-2.5 block ${labelCls}`}
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={formData.password}
                    onChange={handleChange}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    placeholder="••••••••"
                    className={`${inputCls(errors.password)} pr-10`}
                  />
                  <span className={underlineCls(errors.password)} />
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

              <div>
                <label
                  htmlFor="rePassword"
                  className={`mb-2.5 block ${labelCls}`}
                >
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="rePassword"
                    name="rePassword"
                    type={showRePassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={formData.rePassword}
                    onChange={handleChange}
                    aria-invalid={!!errors.rePassword}
                    aria-describedby={
                      errors.rePassword ? "rePassword-error" : undefined
                    }
                    placeholder="••••••••"
                    className={`${inputCls(errors.rePassword)} pr-10`}
                  />
                  <span className={underlineCls(errors.rePassword)} />
                  <button
                    type="button"
                    onClick={() => setShowRePassword((v) => !v)}
                    aria-label={
                      showRePassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                    }
                    aria-pressed={showRePassword}
                    className="absolute bottom-2 right-0 text-smoke transition-colors hover:text-nero focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50"
                  >
                    {showRePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.rePassword && (
                  <p
                    id="rePassword-error"
                    role="alert"
                    className="mt-2 text-xs text-red-600"
                  >
                    {errors.rePassword}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="group relative flex w-full items-center justify-center gap-2.5 bg-champagne py-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-nero transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nero focus-visible:ring-offset-2 focus-visible:ring-offset-ivory disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-nero/30 border-t-nero" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  Đăng ký
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </>
              )}
            </button>

            {/* Footer */}
            <p className="pt-1 text-center text-sm text-smoke">
              Đã có tài khoản?{" "}
              <Link
                to="/login"
                className="font-semibold text-nero underline-offset-4 transition-colors hover:text-champagne hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
              >
                Đăng nhập
              </Link>
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
