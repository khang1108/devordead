import type { Difficulty, ProgrammingLanguage, Tone } from "./common";

export type ProblemStatus = "solved" | "attempted" | "todo";

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface CodingProblem {
  id: string;
  slug: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  role: string;
  status: ProblemStatus;
  description: string;
  constraints: string[];
  examples: ProblemExample[];
  tests: number;
  approvedAt: string;
  starter?: Partial<Record<ProgrammingLanguage, string>>;
}

export type SandboxVerdict = "passed" | "failed" | "tle" | "mle" | "re";

export type SandboxRunMode = "run" | "submit";

export interface SandboxTestCaseResult {
  name: string;
  status: SandboxVerdict;
  timeMs: number;
  memMb: number;
  detail?: string;
}

export interface SandboxExecutionResult {
  mode: SandboxRunMode;
  title: string;
  summary: string;
  tone: Tone;
  totalTime: string;
  peakMem: string;
  exitCode: string;
  note: string;
  coachTitle?: string;
  coachBody?: string;
  tests: SandboxTestCaseResult[];
  /** Chỉ có khi nộp trong Chế độ thi: phiên thi đã đóng kèm đánh giá tính trung thực. */
  exam?: ExamSession;
}

// ——— Chế độ thi (Exam mode) ———

export type ExamEventType =
  | "fullscreen_exit"
  | "tab_hidden"
  | "window_blur"
  | "paste_blocked"
  | "drop_blocked"
  | "large_insert"
  | "resumed";

export interface ExamEvent {
  type: ExamEventType;
  at: string;
  durationMs: number;
  chars: number;
}

export type ExamIntegrityLevel = "clean" | "warning" | "suspicious";

export interface ExamIntegrity {
  level: ExamIntegrityLevel;
  score: number;
  counts: Record<ExamEventType, number>;
  awayMs: number;
  events: ExamEvent[];
}

export type ExamSessionStatus = "active" | "submitted" | "abandoned" | "expired";

export interface ExamSession {
  id: string;
  problemId: string;
  status: ExamSessionStatus;
  durationSec: number;
  startedAt: string;
  endsAt: string;
  endedAt: string | null;
  submissionId: string | null;
  serverNow: string;
  integrity: ExamIntegrity;
}
