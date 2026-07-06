import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { message, Spin } from "antd";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  MailCheck,
  CheckCircle2,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import api from "../../config/api";

const LUXURY_EASE = [0.22, 1, 0.36, 1];
const RESEND_SECONDS = 60;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [messageApi, contextHolder] = message.useMessage();

  // step: "email" -> "otp" -> "password" -> "done"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(
    () => localStorage.getItem("rememberEmail") || ""
  );
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const emailValue = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

  // Đếm ngược thời gian cho phép gửi lại mã.
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [cooldown]);

  const mapError = (err, fallback) => {
    if (!err.response) return "Không thể kết nối đến máy chủ. Vui lòng thử lại.";
    return err.response?.data?.error || fallback;
  };

  // ── Bước 1: gửi OTP ──
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!emailValue) {
      setErrors({ email: "Vui lòng nhập email" });
      return;
    }
    if (!emailValid) {
      setErrors({ email: "Email không hợp lệ" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: emailValue });
      messageApi.success("Mã xác thực đã được gửi tới email của bạn.");
      setStep("otp");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "ACCOUNT_NOT_FOUND") {
        setErrors({ email: "Tài khoản chưa được đăng ký" });
      } else if (code === "GOOGLE_ACCOUNT") {
        setErrors({ email: err.response.data.error });
      } else if (code === "COOLDOWN") {
        // Mã vừa được gửi trước đó — vẫn cho sang bước nhập OTP.
        messageApi.info(err.response.data.error);
        setStep("otp");
        setCooldown(RESEND_SECONDS);
      } else {
        messageApi.error(mapError(err, "Gửi mã thất bại. Vui lòng thử lại."));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Gửi lại OTP ──
  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email: emailValue });
      messageApi.success("Đã gửi lại mã xác thực.");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "COOLDOWN") {
        messageApi.info(err.response.data.error);
        setCooldown(RESEND_SECONDS);
      } else {
        messageApi.error(mapError(err, "Gửi lại mã thất bại."));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 2: xác thực OTP (phải thành công mới sang bước nhập mật khẩu) ──
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: "Mã OTP gồm 6 chữ số" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/auth/verify-otp", {
        email: emailValue,
        otp: otp.trim(),
      });
      messageApi.success("Xác thực thành công!");
      setStep("password");
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "OTP_EXPIRED") {
        setErrors({ otp: "Mã OTP đã hết hạn. Vui lòng gửi lại mã." });
      } else if (code === "INVALID_OTP") {
        setErrors({ otp: "Mã OTP không chính xác" });
      } else {
        messageApi.error(mapError(err, "Xác thực thất bại. Vui lòng thử lại."));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Bước 3: đặt lại mật khẩu (OTP đã xác thực ở bước trước) ──
  const handleReset = async (e) => {
    e?.preventDefault();
    const next = {};
    if (!password) next.password = "Vui lòng nhập mật khẩu mới";
    else if (password.length < 6) next.password = "Mật khẩu tối thiểu 6 ký tự";
    if (confirm !== password) next.confirm = "Mật khẩu nhập lại không khớp";
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", {
        email: emailValue,
        otp: otp.trim(),
        newPassword: password,
      });
      setStep("done");
      messageApi.success("Đặt lại mật khẩu thành công!");
      setTimeout(() => {
        navigate("/login", { state: { email: emailValue } });
      }, 1800);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === "INVALID_OTP" || code === "OTP_EXPIRED") {
        // OTP hết hạn/không hợp lệ giữa chừng -> quay lại bước nhập OTP.
        messageApi.error(
          code === "OTP_EXPIRED"
            ? "Mã OTP đã hết hạn. Vui lòng xác thực lại."
            : "Mã OTP không hợp lệ. Vui lòng xác thực lại."
        );
        setErrors({ otp: err.response.data.error });
        setStep("otp");
      } else if (code === "WEAK_PASSWORD") {
        setErrors({ password: err.response.data.error });
      } else {
        messageApi.error(mapError(err, "Đặt lại mật khẩu thất bại."));
      }
    } finally {
      setLoading(false);
    }
  };

  const fade = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } };

  const inputBase =
    "peer w-full border-0 border-b bg-transparent pb-2.5 text-[15px] text-nero placeholder-smoke/40 transition-colors focus:outline-none disabled:opacity-50";
  const underline = (hasError) =>
    `pointer-events-none absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 ease-out peer-focus:scale-x-100 ${
      hasError ? "bg-red-500" : "bg-champagne"
    }`;

  return (
    <div className="min-h-screen flex bg-ivory font-sans text-nero">
      {contextHolder}

      {/* LEFT · EDITORIAL PANEL (lg+) */}
      <aside className="relative hidden lg:flex lg:w-[55%] overflow-hidden bg-nero">
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
        <span className="pointer-events-none absolute top-10 left-10 h-12 w-12 border-t border-l border-champagne/40" />
        <span className="pointer-events-none absolute bottom-10 right-10 h-12 w-12 border-b border-r border-champagne/40" />
        <Link
          to="/"
          className="absolute top-10 left-12 z-10 font-sans text-4xl font-extrabold uppercase tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-champagne/60 focus-visible:ring-offset-4 focus-visible:ring-offset-nero"
        >
          NPH <span className="text-champagne">Store</span>
        </Link>
        <div className="relative z-10 mt-auto mb-4 p-12 xl:p-16 max-w-3xl">
          <p
            className="font-sans font-extrabold uppercase leading-[1.1] tracking-tight text-white"
            style={{ fontSize: "clamp(1.75rem, 3vw, 2.75rem)" }}
          >
            Khôi phục
            <br />
            <span className="text-champagne">quyền truy cập</span>
          </p>
          <p className="mt-6 text-sm font-light tracking-wide text-white/55">
            Bảo mật tài khoản · Đặt lại mật khẩu an toàn qua email
          </p>
        </div>
      </aside>

      {/* RIGHT · FORM */}
      <main className="relative flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[45%] lg:px-16">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="font-sans text-lg font-extrabold uppercase tracking-tight text-nero lg:hidden"
          >
            NPH <span className="text-champagne">Store</span>
          </Link>
          <Link
            to="/login"
            className="group ml-auto inline-flex items-center gap-2 text-sm text-smoke transition-colors hover:text-nero"
          >
            <ArrowLeft
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            Đăng nhập
          </Link>
        </div>

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
                Quên mật khẩu
              </span>
            </div>
            <h1
              className="font-sans font-extrabold uppercase leading-[1.1] tracking-tight text-nero"
              style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)" }}
            >
              {step === "done" ? (
                <>
                  Hoàn tất
                  <br />
                  đặt lại
                </>
              ) : (
                <>
                  Đặt lại
                  <br />
                  mật khẩu
                </>
              )}
            </h1>
            {step === "email" && (
              <p className="mt-4 text-sm text-smoke">
                Nhập email tài khoản của bạn. Chúng tôi sẽ gửi mã xác thực gồm 6
                chữ số.
              </p>
            )}
            {step === "otp" && (
              <p className="mt-4 flex items-center gap-2 text-sm text-smoke">
                <MailCheck size={16} className="text-champagne" />
                Mã xác thực đã gửi tới{" "}
                <span className="font-semibold text-nero">{emailValue}</span>
              </p>
            )}
            {step === "password" && (
              <p className="mt-4 flex items-center gap-2 text-sm text-smoke">
                <CheckCircle2 size={16} className="text-champagne" />
                Xác thực thành công. Hãy tạo mật khẩu mới cho tài khoản.
              </p>
            )}
          </div>

          {/* STEP 1 · EMAIL */}
          {step === "email" && (
            <form className="space-y-7" onSubmit={handleSendOtp} noValidate>
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
                    disabled={loading}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({});
                    }}
                    placeholder="name@example.com"
                    className={`${inputBase} ${
                      errors.email
                        ? "border-red-400 focus:border-red-500"
                        : "border-whisper focus:border-champagne"
                    }`}
                  />
                  <span className={underline(errors.email)} />
                </div>
                {errors.email && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !emailValue}
                className="group relative flex w-full items-center justify-center gap-2.5 bg-champagne py-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-nero transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spin size="small" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    Gửi mã xác thực
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              <p className="pt-2 text-center text-sm text-smoke">
                Nhớ mật khẩu rồi?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-nero underline-offset-4 transition-colors hover:text-champagne hover:underline"
                >
                  Đăng nhập
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2 · OTP VERIFICATION */}
          {step === "otp" && (
            <form className="space-y-7" onSubmit={handleVerifyOtp} noValidate>
              {/* OTP */}
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-smoke"
                >
                  Mã xác thực (OTP)
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    disabled={loading}
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                      if (errors.otp) setErrors((p) => ({ ...p, otp: "" }));
                    }}
                    placeholder="______"
                    className={`${inputBase} text-center text-2xl font-bold tracking-[0.5em] ${
                      errors.otp
                        ? "border-red-400 focus:border-red-500"
                        : "border-whisper focus:border-champagne"
                    }`}
                  />
                  <span className={underline(errors.otp)} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  {errors.otp ? (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.otp}
                    </p>
                  ) : (
                    <span className="text-xs text-smoke">
                      Mã có hiệu lực trong 10 phút
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || loading}
                    className="text-xs font-semibold text-champagne underline-offset-4 transition-colors hover:underline disabled:cursor-not-allowed disabled:text-smoke disabled:no-underline"
                  >
                    {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="group relative flex w-full items-center justify-center gap-2.5 bg-champagne py-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-nero transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spin size="small" />
                    Đang xác thực...
                  </>
                ) : (
                  <>
                    Xác thực
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setErrors({});
                }}
                className="w-full text-center text-sm text-smoke transition-colors hover:text-nero"
              >
                ← Đổi email khác
              </button>
            </form>
          )}

          {/* STEP 3 · NEW PASSWORD (chỉ hiện sau khi OTP xác thực thành công) */}
          {step === "password" && (
            <form className="space-y-7" onSubmit={handleReset} noValidate>
              {/* New password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-smoke"
                >
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoFocus
                    disabled={loading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password)
                        setErrors((p) => ({ ...p, password: "" }));
                    }}
                    placeholder="••••••••"
                    className={`${inputBase} pr-10 ${
                      errors.password
                        ? "border-red-400 focus:border-red-500"
                        : "border-whisper focus:border-champagne"
                    }`}
                  />
                  <span className={underline(errors.password)} />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute bottom-2 right-0 text-smoke transition-colors hover:text-nero"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label
                  htmlFor="confirm"
                  className="mb-2.5 block font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-smoke"
                >
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    disabled={loading}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (errors.confirm)
                        setErrors((p) => ({ ...p, confirm: "" }));
                    }}
                    placeholder="••••••••"
                    className={`${inputBase} ${
                      errors.confirm
                        ? "border-red-400 focus:border-red-500"
                        : "border-whisper focus:border-champagne"
                    }`}
                  />
                  <span className={underline(errors.confirm)} />
                </div>
                {errors.confirm && (
                  <p role="alert" className="mt-2 text-xs text-red-600">
                    {errors.confirm}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2.5 bg-champagne py-4 font-sans text-xs font-bold uppercase tracking-[0.18em] text-nero transition-all duration-500 hover:shadow-[0_0_40px_rgba(200,169,110,0.35)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Spin size="small" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đặt lại mật khẩu
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3 · DONE */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center gap-5 py-10 text-center">
              <CheckCircle2 size={56} className="text-champagne" strokeWidth={1.5} />
              <div>
                <p className="font-sans text-sm font-semibold uppercase tracking-[0.2em] text-nero">
                  Đặt lại mật khẩu thành công
                </p>
                <p className="mt-2 text-sm text-smoke">
                  Đang chuyển hướng đến trang đăng nhập…
                </p>
              </div>
              <Spin size="large" />
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
