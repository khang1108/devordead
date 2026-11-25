import { NavLink, Outlet } from "react-router-dom";
import Logo from "./Logo.jsx";
import { currentUser, adminUser } from "../data/mock.js";

const CANDIDATE_NAV = [
  ["Luyện tập", [["/dashboard", "Tổng quan"], ["/knowledge", "Kho tri thức"], ["/practice/voice", "Luyện giọng nói"], ["/problems", "Bài tập lập trình"]]],
  ["Phỏng vấn", [["/interview/setup", "Phỏng vấn mô phỏng"], ["/reports", "Báo cáo năng lực"], ["/roadmap", "Lộ trình học"]]],
  ["Tài khoản", [["/profile", "Hồ sơ mục tiêu"]]],
];
const ADMIN_NAV = [["Quản trị", [["/admin/taxonomy", "Danh mục tri thức"], ["/admin/moderation", "Kiểm duyệt nội dung"]]]];

function Sidebar({ admin }) {
  const groups = admin ? ADMIN_NAV : CANDIDATE_NAV;
  const user = admin ? adminUser : currentUser;
  let i = 0;
  return (
    <aside className="sidebar" aria-label="Điều hướng chính">
      <Logo to={admin ? "/admin/taxonomy" : "/dashboard"} />
      <nav className="col" style={{ "--gap": "20px" }}>
        {groups.map(([title, items]) => (
          <div className="sidebar__group" key={title}>
            <p className="t-mono sidebar__title">{title}</p>
            {items.map(([to, label]) => {
              i += 1;
              return (
                <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}>
                  <span className="nav-item__idx" aria-hidden="true">
                    {String(i).padStart(2, "0")}
                  </span>
                  {label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="sidebar__profile">
        <span className="avatar" aria-hidden="true">
          {user.initials}
        </span>
        <div className="col" style={{ "--gap": "0px" }}>
          <span className="t-body-s t-strong">{user.name}</span>
          <span className="t-body-s c-ink2">{user.subtitle}</span>
        </div>
      </div>
    </aside>
  );
}

/** Khung có sidebar cho ứng viên (mặc định) hoặc quản trị viên (admin). */
export default function AppShell({ admin = false }) {
  return (
    <div className="app-shell">
      <Sidebar admin={admin} />
      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  );
}
