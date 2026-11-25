import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate, Link } from "react-router-dom";
import "./styles/app.css";

import AppShell from "./components/AppShell.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import ProfileScreen from "./screens/ProfileScreen.jsx";
import DashboardScreen from "./screens/DashboardScreen.jsx";
import KnowledgeScreen from "./screens/KnowledgeScreen.jsx";
import VoicePracticeScreen from "./screens/VoicePracticeScreen.jsx";
import ProblemsScreen from "./screens/ProblemsScreen.jsx";
import ProblemEditorScreen from "./screens/ProblemEditorScreen.jsx";
import InterviewSetupScreen from "./screens/InterviewSetupScreen.jsx";
import HrInterviewScreen from "./screens/HrInterviewScreen.jsx";
import TechInterviewScreen from "./screens/TechInterviewScreen.jsx";
import SessionEndedScreen from "./screens/SessionEndedScreen.jsx";
import ReportScreen from "./screens/ReportScreen.jsx";
import RoadmapScreen from "./screens/RoadmapScreen.jsx";
import AdminTaxonomyScreen from "./screens/AdminTaxonomyScreen.jsx";
import AdminModerationScreen from "./screens/AdminModerationScreen.jsx";

function NotFound() {
  return (
    <div className="empty" style={{ minHeight: "100vh" }}>
      <p className="t-display-l">404</p>
      <p>Không tìm thấy trang này.</p>
      <Link to="/dashboard">Về trang tổng quan</Link>
    </div>
  );
}

// Hash router: /app/#/dashboard — chạy được trên mọi static hosting, không cần cấu hình rewrite.
const router = createHashRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginScreen /> }, // UC01
  {
    element: <AppShell />,
    children: [
      { path: "/profile", element: <ProfileScreen /> }, // UC02, UC03
      { path: "/dashboard", element: <DashboardScreen /> }, // UC02, UC15
      { path: "/knowledge", element: <KnowledgeScreen /> }, // UC04
      { path: "/practice/voice", element: <VoicePracticeScreen /> }, // UC05, UC06
      { path: "/problems", element: <ProblemsScreen /> }, // UC07
      { path: "/problems/:id", element: <ProblemEditorScreen /> }, // UC08, UC09
      { path: "/interview/setup", element: <InterviewSetupScreen /> }, // UC10
      { path: "/reports", element: <ReportScreen /> }, // UC14, UC16
      { path: "/reports/:id", element: <ReportScreen /> },
      { path: "/roadmap", element: <RoadmapScreen /> }, // UC15
    ],
  },
  // Phòng phỏng vấn: toàn màn hình, không sidebar
  { path: "/interview/hr", element: <HrInterviewScreen /> }, // UC11
  { path: "/interview/technical", element: <TechInterviewScreen /> }, // UC12
  { path: "/interview/ended", element: <SessionEndedScreen /> }, // UC13
  {
    element: <AppShell admin />,
    children: [
      { path: "/admin/taxonomy", element: <AdminTaxonomyScreen /> }, // UC17
      { path: "/admin/moderation", element: <AdminModerationScreen /> }, // UC18
    ],
  },
  { path: "*", element: <NotFound /> },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
