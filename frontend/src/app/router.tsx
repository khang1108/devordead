import { createHashRouter, Link, Navigate } from "react-router-dom";
import AppShell from "@app/layouts/AppShell";
import LoginScreen from "@features/auth/LoginScreen";
import ProfileScreen from "@features/profile/ProfileScreen";
import DashboardScreen from "@features/assessment/DashboardScreen";
import KnowledgeScreen from "@features/knowledge/KnowledgeScreen";
import VoicePracticeScreen from "@features/knowledge/VoicePracticeScreen";
import ProblemsScreen from "@features/coding/ProblemsScreen";
import ProblemEditorScreen from "@features/coding/ProblemEditorScreen";
import InterviewSetupScreen from "@features/interview/InterviewSetupScreen";
import HrInterviewScreen from "@features/interview/HrInterviewScreen";
import TechInterviewScreen from "@features/interview/TechInterviewScreen";
import SessionEndedScreen from "@features/interview/SessionEndedScreen";
import ReportScreen from "@features/assessment/ReportScreen";
import RoadmapScreen from "@features/assessment/RoadmapScreen";
import AdminTaxonomyScreen from "@features/admin/AdminTaxonomyScreen";
import AdminModerationScreen from "@features/admin/AdminModerationScreen";

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
export const router = createHashRouter([
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
      { path: "/interview/setup", element: <InterviewSetupScreen /> }, // UC10
      { path: "/reports", element: <ReportScreen /> }, // UC14, UC16
      { path: "/reports/:id", element: <ReportScreen /> },
      { path: "/roadmap", element: <RoadmapScreen /> }, // UC15
    ],
  },
  // Không gian làm việc toàn màn hình kiểu LeetCode Workbench (IDE + Phòng phỏng vấn)
  { path: "/problems/:id", element: <ProblemEditorScreen /> }, // UC08, UC09
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
