import type { Difficulty } from "./common";

export type ModerationKind = "question" | "problem";

export type ModerationDecision = "approved" | "rejected";

export interface ModerationItem {
  id: string;
  kind: ModerationKind;
  title: string;
  source: string;
  topic: string;
  competency: string;
  difficulty: Difficulty;
  createdAt: string;
  reference: string;
  criteria: string[];
  revision?: number;
}

export interface ProcessedModerationItem {
  id: string;
  kind: ModerationKind;
  title: string;
  decision: ModerationDecision;
  reason?: string;
  processedAt: string;
}

export interface TaxonomyAuditEntry {
  id?: string;
  at: string;
  who: string;
  what: string;
}
