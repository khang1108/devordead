import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Logo from "@shared/components/Logo";
import { setAuthToken } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";

type NavIconKind =
  | "grid"
  | "book"
  | "mic"
  | "code"
  | "play"
  | "report"
  | "route"
  | "target"
  | "tree"
  | "shield";

type NavItemDef = readonly [to: string, label: string, icon: NavIconKind];
type NavGroupDef = readonly [title: string, items: readonly NavItemDef[]];

const TOP_CANDIDATE_NAV: readonly NavItemDef[] = [
  ["/dashboard", "Tổng quan", "grid"],
  ["/problems", "Bài tập", "code"],
  ["/knowledge", "Kho tri thức", "book"],
  ["/practice/voice", "Luyện giọng", "mic"],
  ["/interview/setup", "Phỏng vấn", "play"],
  ["/roadmap", "Lộ trình", "route"],
  ["/reports", "Báo cáo", "report"],
];

const TOP_ADMIN_NAV: readonly NavItemDef[] = [
  ["/admin/taxonomy", "Danh mục tri thức", "tree"],
  ["/admin/moderation", "Kiểm duyệt nội dung", "shield"],
];

const CANDIDATE_RAIL: readonly NavGroupDef[] = [
  [
    "Không gian học",
    [
      ["/dashboard", "Tổng quan", "grid"],
      ["/problems", "Ngân hàng bài tập", "code"],
      ["/knowledge", "Kho tri thức", "book"],
      ["/practice/voice", "Luyện giọng nói", "mic"],
      ["/roadmap", "Lộ trình học", "route"],
    ],
  ],
  [
    "Phỏng vấn & Đánh giá",
    [
      ["/interview/setup", "Phỏng vấn mô phỏng", "play"],
      ["/reports", "Báo cáo năng lực", "report"],
    ],
  ],
  ["Cá nhân hóa", [["/profile", "Hồ sơ & CV/JD", "target"]]],
];

const ADMIN_RAIL: readonly NavGroupDef[] = [
  [
    "Quản trị hệ thống",
    [
      ["/admin/taxonomy", "Danh mục tri thức", "tree"],
      ["/admin/moderation", "Kiểm duyệt nội dung", "shield"],
    ],
  ],
];

function NavIcon({ kind }: { kind: NavIconKind }) {
  switch (kind) {
    case "grid":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "book":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3 2.75A1.25 1.25 0 0 1 4.25 1.5h8.25v11.5H4.25A1.25 1.25 0 0 0 3 14.25V2.75Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M3 13a1.25 1.25 0 0 1 1.25-1.25h8.25" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "mic":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5.75" y="1.75" width="4.5" height="7.5" rx="2.25" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.25M5.75 14.25h4.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "code":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "play":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2.5" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M6.5 5.75 10.25 8 6.5 10.25v-4.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "report":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M3.25 13.5V8.5M8 13.5V3.5M12.75 13.5V6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "route":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="3.5" cy="12.5" r="1.75" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="12.5" cy="3.5" r="1.75" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M5.25 12.5h2.5a2.25 2.25 0 0 0 0-4.5h-.5a2.25 2.25 0 0 1 0-4.5h3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "target":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="8" r="2.25" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "tree":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="4.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9.5" y="6.25" width="4.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9.5" y="11" width="4.5" height="3.5" rx="0.8" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M4.25 5.5v7.25h5.25M4.25 8h5.25"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "shield":
      return (
        <svg className="nav-item__icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.75 13 3.75v4c0 3.2-2.15 5.45-5 6.5-2.85-1.05-5-3.3-5-6.5v-4L8 1.75Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="m5.85 8.1 1.45 1.45 2.95-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

function deriveInitials(name: string, fallback: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? fallback).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || fallback;
}

export interface AppShellProps {
  admin?: boolean;
}

/**
 * Khung học tập & làm việc kiểu LeetCode:
 * Thanh điều hướng trên cố định 50px (Logo + tab chính + chuyển cổng + tài khoản)
 * kết hợp thanh bên trái thu gọn được (204px → 56px) và drawer trên thiết bị nhỏ.
 */
export default function AppShell({ admin = false }: AppShellProps) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => localStore.getSidebarCollapsed());

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStore.setSidebarCollapsed(next);
      return next;
    });
  };

  const storedUser = localStore.getUser();
  const targetProfile = localStore.getTargetProfile();

  const displayAccount = admin
    ? storedUser?.accountRole === "admin"
      ? {
          name: storedUser.name,
          initials: storedUser.initials || deriveInitials(storedUser.name, "QT"),
          subtitle: storedUser.subtitle || "Quản trị hệ thống",
        }
      : {
          name: "Quản trị viên",
          initials: "QT",
          subtitle: "Cổng kiểm duyệt",
        }
    : storedUser
      ? {
          name: storedUser.name,
          initials: storedUser.initials || deriveInitials(storedUser.name, "UV"),
          subtitle: storedUser.subtitle || `${storedUser.role} · ${storedUser.level}`,
        }
      : {
          name: "Tài khoản ứng viên",
          initials: "UV",
          subtitle: `${targetProfile.role} · ${targetProfile.level}`,
        };

  const topItems = admin ? TOP_ADMIN_NAV : TOP_CANDIDATE_NAV;
  const railGroups = admin ? ADMIN_RAIL : CANDIDATE_RAIL;

  const handleSignOut = () => {
    setAuthToken(null);
    localStore.setUser(null);
    setDrawerOpen(false);
  };

  return (
    <div className={`lc-shell ${collapsed ? "is-collapsed" : ""}`.trim()}>
      <button
        type="button"
        className="skip-link"
        onClick={() => {
          const mainEl = document.getElementById("main");
          mainEl?.focus();
        }}
      >
        Chuyển tới nội dung chính
      </button>

      {/* LeetCode-style 50px Unified Top Navigation Bar */}
      <header className="lc-topbar">
        <div className="lc-topbar__left">
          <button
            type="button"
            className="lc-topbar__menu-btn"
            aria-expanded={drawerOpen}
            aria-controls="app-sidebar-nav"
            aria-label={drawerOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            onClick={() => setDrawerOpen((prev) => !prev)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {drawerOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>

          <Logo to={admin ? "/admin/taxonomy" : "/dashboard"} size={24} />

          <nav className="lc-topnav" aria-label="Điều hướng nhanh">
            {topItems.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `lc-topnav__link ${isActive ? "is-active" : ""}`.trim()}
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="lc-topbar__right">
          {!admin && (
            <Link to="/problems/sandbox" className="lc-topbar__ide-btn" title="Mở trình soạn thảo Sandbox IDE">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Sandbox IDE</span>
            </Link>
          )}

          <div className="lc-topbar__portal" role="group" aria-label="Chuyển đổi cổng">
            <Link
              to="/dashboard"
              className={`lc-topbar__portal-btn ${!admin ? "is-active" : ""}`.trim()}
              aria-current={!admin ? "true" : undefined}
            >
              Ứng viên
            </Link>
            <Link
              to="/admin/taxonomy"
              className={`lc-topbar__portal-btn ${admin ? "is-active" : ""}`.trim()}
              aria-current={admin ? "true" : undefined}
            >
              Quản trị
            </Link>
          </div>

          <a href="/" className="lc-topbar__icon-btn" title="Về trang giới thiệu" aria-label="Về trang giới thiệu">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>

          <Link
            to={admin ? "/admin/taxonomy" : "/profile"}
            className="lc-topbar__user"
            title={`${displayAccount.name} (${displayAccount.subtitle})`}
          >
            <span className="avatar" aria-hidden="true">
              {displayAccount.initials}
            </span>
          </Link>
        </div>
      </header>

      {drawerOpen && (
        <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setDrawerOpen(false)} />
      )}

      <div className="lc-shell__body">
        <aside
          id="app-sidebar-nav"
          className={`lc-rail ${isOpenClass(drawerOpen)} ${collapsed ? "is-collapsed" : ""}`.trim()}
          aria-label="Thanh bên không gian học"
        >
          <div className="lc-rail__head">
            {!collapsed && (
              <span className="lc-rail__context">
                {admin ? "Cổng quản trị" : `${targetProfile.role} · ${targetProfile.level}`}
              </span>
            )}
            <button
              type="button"
              className="lc-rail__collapse-btn"
              onClick={toggleCollapse}
              aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
              title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                {collapsed ? (
                  <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M10 3.5 5.5 8 10 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </button>
          </div>

          <nav className="lc-rail__nav" aria-label={admin ? "Menu quản trị" : "Menu ứng viên"}>
            {railGroups.map(([title, items]) => (
              <div className="sidebar__group" key={title}>
                {!collapsed && <p className="sidebar__title">{title}</p>}
                {items.map(([to, label, icon]) => (
                  <NavLink
                    key={to}
                    to={to}
                    title={collapsed ? label : undefined}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`.trim()}
                  >
                    <NavIcon kind={icon} />
                    {!collapsed && <span className="nav-item__label">{label}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__profile">
              <span className="avatar" aria-hidden="true">
                {displayAccount.initials}
              </span>
              {!collapsed && (
                <div className="sidebar__profile-meta">
                  <span className="sidebar__profile-name">{displayAccount.name}</span>
                  <span className="sidebar__profile-sub">{displayAccount.subtitle}</span>
                </div>
              )}
              {!collapsed && (
                <Link
                  to="/login"
                  onClick={handleSignOut}
                  className="sidebar__signout"
                  aria-label="Đăng xuất và về màn hình đăng nhập"
                  title="Đăng xuất (UC01)"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </aside>

        <main className="main" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function isOpenClass(open: boolean): string {
  return open ? "is-open" : "";
}
