import { useEffect, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { Spin } from "antd";
import Cookies from "js-cookie";

const LoginSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Set token cookie first
      Cookies.set("jwt", token, { expires: 1 / 24, sameSite: "Lax" });
      
      login(null, token)
        .then(() => {
          navigate("/");
        })
        .catch((err) => {
          console.error("Lỗi đăng nhập Google:", err);
          navigate("/login");
        });
    } else {
      navigate("/login");
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
      <div className="text-center">
        <Spin size="large" />
        <p className="mt-4 text-gray-500 dark:text-zinc-400 font-medium">Đang hoàn tất đăng nhập...</p>
      </div>
    </div>
  );
};

export default LoginSuccess;
