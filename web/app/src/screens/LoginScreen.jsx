import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { Button, Callout, Card, Field, Tabs } from "../components/ui.jsx";
import "./LoginScreen.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUTH_TABS = [
  { value: "login", label: "Đăng nhập" },
  { value: "register", label: "Đăng ký" },
];

export default function LoginScreen() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [banner, setBanner] = useState(null); // { tone, text, actionLabel?, onAction? }
  const [loadingTarget, setLoadingTarget] = useState(null); // "submit" | "google" | "github" | null

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setFieldErrors({});
    setBanner(null);
  };

  const validate = () => {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Vui lòng nhập email.";
    } else if (!EMAIL_RE.test(trimmedEmail)) {
      errors.email = "Email chưa đúng định dạng.";
    }

    if (!password) {
      errors.password = "Vui lòng nhập mật khẩu.";
    } else if (password.length < 8) {
      errors.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    }

    if (tab === "register") {
      if (!confirmPassword) {
        errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
      } else if (confirmPassword !== password) {
        errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoadingTarget("submit");

    timerRef.current = setTimeout(() => {
      setLoadingTarget(null);

      if (tab === "login") {
        if (password === "wrongpass") {
          setBanner({
            tone: "danger",
            text: "Email hoặc mật khẩu không đúng.",
          });
          return;
        }
        navigate("/dashboard");
        return;
      }

      if (normalizedEmail === "taken@email.com") {
        setBanner({
          tone: "danger",
          text: "Email này đã được đăng ký.",
          actionLabel: "Chuyển sang Đăng nhập",
        });
        return;
      }

      navigate("/profile");
    }, 800);
  };

  const handleOAuth = (provider) => {
    setBanner(null);
    setFieldErrors({});
    setLoadingTarget(provider);

    timerRef.current = setTimeout(() => {
      setLoadingTarget(null);
      navigate("/profile");
    }, 800);
  };

  const handleForgotPassword = () => {
    setBanner({
      tone: "brand",
      text: email.trim()
        ? `Nếu ${email.trim()} tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.`
        : "Nhập email của bạn ở trên rồi bấm Quên mật khẩu để nhận hướng dẫn đặt lại.",
    });
  };

  const isBusy = loadingTarget !== null;

  return (
    <div className="login-page">
      <section className="login-hero" aria-label="Giới thiệu DevOrDead">
        <Logo onDark to="/login" />

        <div className="login-hero__body">
          <h1 className="t-display-xl login-hero__title">
            <span>TỐT NGHIỆP RỒI.</span>
            <span>GIỜ LÀ</span>
            <span className="login-hero__accent">PHỎNG VẤN.</span>
          </h1>
          <p className="t-body-m login-hero__desc">
            Luyện phỏng vấn kỹ thuật theo vị trí và JD thực tế: trả lời bằng giọng nói, giải bài trong sandbox và nhận phản hồi từ AI trước ngày gặp nhà tuyển dụng.
          </p>
        </div>

        <ul className="login-hero__points">
          <li className="t-mono">01 — Luyện kiến thức bằng giọng nói</li>
          <li className="t-mono">02 — Live coding, chấm trong sandbox</li>
          <li className="t-mono">03 — Phỏng vấn mô phỏng với AI</li>
        </ul>
      </section>

      <main className="login-panel">
        <Card className="login-card">
          <Tabs tabs={AUTH_TABS} value={tab} onChange={switchTab} label="Chế độ xác thực" />

          {banner && (
            <Callout tone={banner.tone}>
              <div className="col stack-sm">
                <p>{banner.text}</p>
                {banner.actionLabel && (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => switchTab("login")}>
                      {banner.actionLabel}
                    </Button>
                  </div>
                )}
              </div>
            </Callout>
          )}

          <form className="col" onSubmit={handleSubmit} noValidate>
            <Field
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={fieldErrors.email}
            />

            <Field
              label="Mật khẩu"
              type="password"
              name="password"
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              placeholder="Ít nhất 8 ký tự"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={fieldErrors.password}
            />

            {tab === "login" && (
              <div className="login-forgot-row">
                <button type="button" className="login-link-btn" onClick={handleForgotPassword}>
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {tab === "register" && (
              <Field
                label="Xác nhận mật khẩu"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                error={fieldErrors.confirmPassword}
              />
            )}

            <Button type="submit" variant="primary" block disabled={isBusy}>
              {loadingTarget === "submit" && <span className="spinner" aria-hidden="true" />}
              {tab === "login" ? "Đăng nhập" : "Tạo tài khoản"}
            </Button>
          </form>

          {tab === "login" && (
            <>
              <div className="login-divider t-mono" aria-hidden="true">
                HOẶC
              </div>

              <div className="col stack-sm">
                <Button variant="secondary" block disabled={isBusy} onClick={() => handleOAuth("google")}>
                  {loadingTarget === "google" ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : (
                    <svg className="login-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M21.35 11.1h-9.17v2.98h5.27c-.23 1.47-1.72 4.31-5.27 4.31-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.8 4.18 14.7 3.25 12.18 3.25 7.21 3.25 3.18 7.28 3.18 12.25s4.03 9 9 9c5.19 0 8.64-3.65 8.64-8.79 0-.59-.07-1.04-.17-1.36Z"
                      />
                    </svg>
                  )}
                  Tiếp tục với Google
                </Button>

                <Button variant="secondary" block disabled={isBusy} onClick={() => handleOAuth("github")}>
                  {loadingTarget === "github" ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : (
                    <svg className="login-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
                      />
                    </svg>
                  )}
                  Tiếp tục với GitHub
                </Button>
              </div>
            </>
          )}

          <footer className="login-footer">
            <span className="t-mono login-footer__meta">HTTPS · JWT · OAUTH2</span>
            <Link className="login-footer__admin" to="/admin/taxonomy">
              Vào trang quản trị (demo)
            </Link>
          </footer>
        </Card>
      </main>
    </div>
  );
}
