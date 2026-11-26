import type { Difficulty, ProgrammingLanguage } from "./common";
import type { SandboxExecutionResult } from "./coding";

export type InterviewMode = "hr" | "technical";

export type InterviewDuration = 15 | 30 | 45;

export interface InterviewConfig {
  mode: InterviewMode;
  duration: InterviewDuration;
  difficulty: Difficulty;
  useCv: boolean;
}

export type TranscriptSpeaker = "ai" | "you" | "hint";

export interface TranscriptTurn {
  id?: string;
  who: TranscriptSpeaker;
  text: string;
  timestamp?: string;
}

export interface StarCriterion {
  key: "S" | "T" | "A" | "R";
  name: string;
  vi: string;
  hint: string;
}

export interface InterviewSession {
  sessionId: string;
  mode: InterviewMode;
  duration: InterviewDuration;
  difficulty: Difficulty;
  useCv: boolean;
  plan: string[];
  problemId?: string;
  startedAt: string;
  initialTurns: TranscriptTurn[];
}

export interface SessionSnapshot {
  sessionId?: string;
  mode: InterviewMode;
  duration: InterviewDuration;
  difficulty?: Difficulty;
  reason: "hard-stop" | "early-end";
  endedAt: string;
  turns: TranscriptTurn[];
  code?: string;
  language?: ProgrammingLanguage;
  problemTitle?: string;
  sandboxResult?: SandboxExecutionResult | null;
  reportId?: string | null;
}
