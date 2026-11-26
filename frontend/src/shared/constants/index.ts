import type {
  CareerLevel,
  Difficulty,
  LabeledToneMeta,
  LanguageOption,
  ProblemStatus,
  ProgrammingLanguage,
  RoleFamily,
  SandboxVerdict,
  StarCriterion,
} from "@shared/types";

export const ROLE_FAMILIES: readonly RoleFamily[] = [
  { family: "Phát triển phần mềm", roles: ["Backend", "Frontend", "Fullstack", "Mobile"] },
  { family: "Dữ liệu & AI", roles: ["AI Engineer", "Data Engineer", "Data Analyst"] },
];

export const LEVELS: readonly CareerLevel[] = ["Intern", "Fresher", "Junior"];

export const LANGUAGES: readonly LanguageOption[] = [
  { value: "python", label: "Python 3" },
  { value: "javascript", label: "JavaScript" },
  { value: "cpp", label: "C++ 17" },
  { value: "java", label: "Java 17" },
];

export const DIFFICULTY_META: Record<Difficulty, LabeledToneMeta> = {
  easy: { label: "Dễ", tone: "success" },
  medium: { label: "Trung bình", tone: "warning" },
  hard: { label: "Khó", tone: "danger" },
};

export const PROBLEM_STATUS_META: Record<ProblemStatus, LabeledToneMeta> = {
  solved: { label: "Đã giải", tone: "success" },
  attempted: { label: "Đang làm", tone: "brand" },
  todo: { label: "Chưa làm", tone: "neutral" },
};

export const TEST_STATUS_META: Record<SandboxVerdict, LabeledToneMeta> = {
  passed: { label: "Passed", tone: "success" },
  failed: { label: "Wrong answer", tone: "danger" },
  tle: { label: "TLE", tone: "warning" },
  mle: { label: "MLE", tone: "warning" },
  re: { label: "Runtime error", tone: "danger" },
};

export const SANDBOX_STEPS: readonly string[] = [
  "Nhận mã nguồn",
  "Gán nhãn untrusted",
  "Khởi tạo cgroups v2",
  "Chép /tmp & biên dịch",
  "Chạy bộ test case",
  "Đo thời gian & RAM",
  "Hủy container & dọn /tmp",
];

export const SANDBOX_LIMITS: readonly string[] = [
  "cgroups v2",
  "1 vCPU",
  "256 MB RAM",
  "50 MB /tmp",
  "network=none",
  "ro-rootfs",
  "timeout 3s",
];

export const SANDBOX_CONSTRAINTS_SPEC =
  "cgroups v2 · 1 vCPU · 256 MB RAM · 50 MB /tmp · network=none · ro-rootfs · timeout 3s";

export const DEFAULT_CODE_TEMPLATES: Record<ProgrammingLanguage, string> = {
  python: "class Solution:\n    def solve(self, *args):\n        # Viết lời giải của bạn ở đây\n        pass\n",
  javascript: "function solve(...args) {\n  // Viết lời giải của bạn ở đây\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // Viết lời giải của bạn ở đây\n    }\n};\n",
  java: "class Solution {\n    public void solve() {\n        // Viết lời giải của bạn ở đây\n    }\n}\n",
};

export const STAR_CRITERIA: readonly StarCriterion[] = [
  { key: "S", name: "Situation", vi: "Bối cảnh", hint: "Mô tả dự án, nhóm và bối cảnh xảy ra sự việc." },
  { key: "T", name: "Task", vi: "Nhiệm vụ", hint: "Trách nhiệm cụ thể hoặc mục tiêu bạn cần đạt." },
  { key: "A", name: "Action", vi: "Hành động", hint: "Các bước chính bạn trực tiếp thực hiện và lý do chọn." },
  { key: "R", name: "Result", vi: "Kết quả", hint: "Tác động đo được và bài học rút ra sau cùng." },
];

export const HR_INTERVIEW_PLAN: readonly string[] = [
  "Introduction",
  "Project experience",
  "Behavioral (STAR)",
  "Situational",
  "Culture fit",
];

export const TECH_INTERVIEW_PLAN: readonly string[] = [
  "Giới thiệu & dự án",
  "Kiến thức chuyên môn",
  "Phân tích hệ thống",
  "Live coding trong Sandbox",
  "Độ phức tạp & edge case",
];

export const ROLE_COMPETENCY_BLUEPRINT: Record<string, readonly string[]> = {
  Backend: ["Cấu trúc dữ liệu & Giải thuật", "PostgreSQL & Indexing", "REST API & Idempotency", "Redis & Caching", "Docker & CI/CD"],
  Frontend: ["JavaScript & Event Loop", "React & State Architecture", "CSS Layout & Accessibility", "Web Performance", "Testing & Security"],
  Fullstack: ["API Design & Auth (JWT/OAuth2)", "Relational Database Modeling", "React SPA Architecture", "Caching & Queues", "Deployment & Observability"],
  Mobile: ["Lifecycle & State Management", "Networking & Offline Sync", "UI Thread & Rendering 60fps", "Local Storage & Security", "App Release Pipeline"],
  "AI Engineer": ["Python & Linear Algebra", "Transformer & Attention", "RAG & Prompt Evaluation", "Model Serving & Latency", "Data Pipeline Hygiene"],
  "Data Engineer": ["SQL & Query Optimization", "ETL/ELT & Orchestration", "Data Modeling & Warehousing", "Distributed Processing", "Data Quality & Lineage"],
  "Data Analyst": ["SQL & Window Functions", "Statistical Analysis", "Experimentation & A/B Testing", "Dashboard Storytelling", "Business Metrics Design"],
};
