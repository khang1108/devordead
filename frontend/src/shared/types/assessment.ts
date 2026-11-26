import type { DeltaTone, Difficulty } from "./common";
import type { SandboxTestCaseResult } from "./coding";
import type { TranscriptTurn } from "./interview";

export interface DashboardStat {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: DeltaTone;
}

export interface CompetencyMastery {
  name: string;
  mastery: number;
}

export interface DashboardOverview {
  stats: DashboardStat[];
  competencies: CompetencyMastery[];
  roadmapHighlights: RoadmapItem[];
  recentReports: EvaluationReport[];
}

export type ReportStatus = "done" | "interrupted";

export interface CodeCorrectnessScore {
  score: number;
  passed: number;
  total: number;
  note: string;
}

export interface ReasoningScore {
  score: number;
  note: string;
}

export interface ReportCompetency {
  id: string;
  name: string;
  score: number;
  evidence: string;
  reevaluationStatus?: "pending" | "resolved";
}

export interface EvaluationReport {
  id: string;
  type: string;
  duration: number;
  date: string;
  status: ReportStatus;
  overall: number | null;
  correctness?: CodeCorrectnessScore;
  reasoning?: ReasoningScore;
  competencies?: ReportCompetency[];
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  transcript?: TranscriptTurn[];
  codeSnapshot?: string;
  testResults?: SandboxTestCaseResult[];
}

export interface ReevaluationRequestPayload {
  competencyId: string;
  reason: string;
}

export interface ReevaluationResponse {
  requestId: string;
  competencyId: string;
  status: "pending" | "resolved";
  submittedAt: string;
}

export type RoadmapItemType = "topic" | "problem" | "voice" | "interview";

export type RoadmapPriority = "high" | "medium" | "low";

export interface RoadmapItem {
  id: string;
  type: RoadmapItemType;
  title: string;
  priority: RoadmapPriority;
  difficulty: Difficulty;
  reason: string;
  to: string;
}

export type RoadmapHubState = "done" | "current" | "todo";

export interface RoadmapHub {
  name: string;
  state: RoadmapHubState;
  summary?: string;
}

export interface RoadmapData {
  updatedAt: string;
  hubs: RoadmapHub[];
  items: RoadmapItem[];
}
