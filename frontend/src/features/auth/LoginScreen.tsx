import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "@shared/components/Logo";
import { ApiError, getErrorMessage } from "@shared/services/apiClient";
import type { OAuthProvider, Tone } from "@shared/types";
import { Button, Callout, Card, Field, RuleTag, Tabs, type TabItem } from "@shared/ui";
import { authService } from "./auth.service";
import ThreeHeroScene from "./ThreeHeroScene";
import "./LoginScreen.css";

type AuthTab = "login" | "register";
type LoadingTarget = "submit" | "forgot" | OAuthProvider | null;

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface AuthBanner {
  tone: Tone;
  text: string;
  actionLabel?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AUTH_TABS: readonly TabItem<AuthTab>[] = [
  { value: "login", label: "Đăng nhập" },
  { value: "register", label: "Đăng ký" },
];

const HERO_PILLARS = [
  { title: "Luyện kiến thức bằng giọng nói", detail: "Phản hồi ≤ 2,5 giây" },
  { title: "Live coding trong Docker Sandbox", detail: "Chấm tự động cô lập" },
  { title: "Phỏng vấn mô phỏng với AI", detail: "Chấm độc lập mã & lập luận" },
] as const;

function GoogleBrandIcon() {
  return (
    <svg className="login-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

function GitHubBrandIcon() {
  return (
    <svg className="login-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#111418"
        d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.08 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z"
      />
    </svg>
  );
}

export default function LoginScreen() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<AuthBanner | null>(null);
  const [loadingTarget, setLoadingTarget] = useState<LoadingTarget>(null);

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setFieldErrors({});
    setBanner(null);
  };

  const validate = (): boolean => {
    const errors: FieldErrors = {};
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoadingTarget("submit");

    try {
      if (tab === "login") {
        await authService.login({ email: normalizedEmail, password });
        navigate("/dashboard");
      } else {
        await authService.register({ email: normalizedEmail, password });
        navigate("/profile");
      }
    } catch (err) {
      const isEmailTaken = tab === "register" && err instanceof ApiError && err.status === 409;
      setBanner({
        tone: "danger",
        text: getErrorMessage(
          err,
          tab === "login" ? "Không thể đăng nhập. Vui lòng kiểm tra lại thông tin." : "Không thể tạo tài khoản.",
        ),
        actionLabel: isEmailTaken ? "Chuyển sang Đăng nhập" : undefined,
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setBanner(null);
    setFieldErrors({});
    setLoadingTarget(provider);

    try {
      const result = await authService.startOAuth(provider);
      if (!result.redirected) {
        navigate("/profile");
      }
    } catch (err) {
      setBanner({
        tone: "danger",
        text: getErrorMessage(err, `Không thể kết nối OAuth với ${provider === "google" ? "Google" : "GitHub"}.`),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Nhập địa chỉ email hợp lệ ở trên để nhận liên kết đặt lại mật khẩu.",
      }));
      return;
    }

    setBanner(null);
    setLoadingTarget("forgot");
    try {
      const res = await authService.requestPasswordReset(trimmedEmail);
      setBanner({
        tone: "brand",
        text:
          res.message ??
          `Nếu ${trimmedEmail} tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi.`,
      });
    } catch (err) {
      setBanner({
        tone: "danger",
        text: getErrorMessage(err, "Không thể gửi yêu cầu đặt lại mật khẩu."),
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  const isBusy = loadingTarget !== null;

  return (
    <div className="login-page">
      <section className="login-hero" aria-label="Giới thiệu DevOrDead">
        <div className="login-hero__top">
          <Logo onDark to="/login" size={26} />
          <a href="/" className="login-hero__home">
            Trang giới thiệu <span aria-hidden="true">↗</span>
          </a>
        </div>

        <div className="login-hero__copy">
          <h1 className="t-display-xl login-hero__title">
            Tốt nghiệp rồi.{" "}
            <span className="login-hero__muted">Giờ là phỏng vấn.</span>
          </h1>
          <p className="t-body-m login-hero__desc">
            Luyện phỏng vấn kỹ thuật theo vị trí và JD thực tế: trả lời bằng giọng nói, viết code trong sandbox và nhận đánh giá theo từng năng lực.
          </p>
        </div>

        <div className="login-hero__stage">
          <ThreeHeroScene />
        </div>

        <ul className="login-hero__points">
          {HERO_PILLARS.map((item) => (
            <li key={item.title} className="login-hero__point">
              <span className="login-hero__point-title">{item.title}</span>
              <span className="login-hero__point-detail">{item.detail}</span>
            </li>
          ))}
        </ul>
      </section>

      <main className="login-panel" id="main">
        <Card className="login-card">
          <div className="login-card__head">
            <h2 className="t-heading-m">
              {tab === "login" ? "Đăng nhập vào tài khoản" : "Tạo tài khoản mới"}
            </h2>
            <RuleTag code="NFR03">HTTPS</RuleTag>
          </div>

          <Tabs tabs={AUTH_TABS} value={tab} onChange={switchTab} label="Chế độ xác thực" />

          {banner && (
            <Callout tone={banner.tone} role="alert">
              <div className="col stack-sm">
                <p className="t-strong">{banner.text}</p>
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

          <form className="col" onSubmit={(e) => void handleSubmit(e)} noValidate>
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
                <button
                  type="button"
                  className="login-link-btn"
                  disabled={isBusy}
                  onClick={() => void handleForgotPassword()}
                >
                  {loadingTarget === "forgot" ? "Đang gửi yêu cầu…" : "Quên mật khẩu?"}
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
              <div className="login-divider" aria-hidden="true">
                hoặc
              </div>

              <div className="col stack-sm">
                <Button
                  variant="secondary"
                  block
                  disabled={isBusy}
                  onClick={() => void handleOAuth("google")}
                >
                  {loadingTarget === "google" ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : (
                    <GoogleBrandIcon />
                  )}
                  Tiếp tục với Google
                </Button>

                <Button
                  variant="secondary"
                  block
                  disabled={isBusy}
                  onClick={() => void handleOAuth("github")}
                >
                  {loadingTarget === "github" ? (
                    <span className="spinner" aria-hidden="true" />
                  ) : (
                    <GitHubBrandIcon />
                  )}
                  Tiếp tục với GitHub
                </Button>
              </div>
            </>
          )}

          <footer className="login-footer">
            <span className="t-mono login-footer__meta">HTTPS · JWT · OAuth2</span>
            <nav className="login-footer__links" aria-label="Điều hướng nhanh">
              <Link className="login-footer__nav" to="/dashboard">
                Vào ứng dụng →
              </Link>
              <span className="login-footer__sep" aria-hidden="true">·</span>
              <Link className="login-footer__nav" to="/admin/taxonomy">
                Trang quản trị
              </Link>
            </nav>
          </footer>
        </Card>
      </main>
    </div>
  );
}
