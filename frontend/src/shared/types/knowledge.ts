import type { CareerLevel } from "./common";

export interface CompetencyItem {
  id?: string;
  name: string;
  mastery: number;
  disabled?: boolean;
  description?: string;
  level?: CareerLevel;
  roles?: string[];
}

export interface KnowledgeTopic {
  id: string;
  name: string;
  short: string;
  jd: boolean;
  description: string;
  competencies: CompetencyItem[];
  practiced: number;
  avgScore: number;
  lastPracticed: string;
  disabled?: boolean;
  level?: CareerLevel;
  roles?: string[];
}

export interface KnowledgeDomain {
  id: string;
  name: string;
  description?: string;
  topics: KnowledgeTopic[];
  disabled?: boolean;
  level?: CareerLevel;
  roles?: string[];
}

export interface VoiceFeedback {
  score: number;
  correct: string[];
  missing: string[];
  wrong: string[];
  followUp: string;
  latencyMs?: number;
}

export interface VoiceSessionData {
  topicId: string;
  topicName: string;
  questions: string[];
}

export interface VoiceAnswerEvaluation {
  transcript: string;
  feedback: VoiceFeedback;
}
