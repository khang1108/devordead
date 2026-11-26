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
}
