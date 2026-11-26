import { apiPost, buildWsUrl } from "@shared/services/apiClient";
import type {
  InterviewConfig,
  InterviewSession,
  SessionSnapshot,
  TranscriptTurn,
} from "@shared/types";

export interface SendTurnResponse {
  turn?: TranscriptTurn;
  reply?: TranscriptTurn;
  stageIndex?: number;
  latencyMs?: number;
  starCovered?: Partial<Record<"S" | "T" | "A" | "R", boolean>>;
}

export interface RequestHintResponse {
  hint: TranscriptTurn;
  hintsUsed?: number;
}

export interface FinalizeSessionResponse {
  snapshotId?: string;
  reportId?: string | null;
  finalizedAt?: string;
}

export const interviewService = {
  createSession(config: InterviewConfig, signal?: AbortSignal): Promise<InterviewSession> {
    return apiPost<InterviewSession>("/interviews/sessions", config, signal);
  },

  sendTurn(sessionId: string, text: string, signal?: AbortSignal): Promise<SendTurnResponse> {
    return apiPost<SendTurnResponse>(
      `/interviews/sessions/${encodeURIComponent(sessionId)}/turns`,
      { text },
      signal,
    );
  },

  requestHint(sessionId: string, signal?: AbortSignal): Promise<RequestHintResponse> {
    return apiPost<RequestHintResponse>(
      `/interviews/sessions/${encodeURIComponent(sessionId)}/hint`,
      {},
      signal,
    );
  },

  finalizeSession(
    sessionId: string,
    snapshot: SessionSnapshot,
    signal?: AbortSignal,
  ): Promise<FinalizeSessionResponse> {
    return apiPost<FinalizeSessionResponse>(
      `/interviews/sessions/${encodeURIComponent(sessionId)}/finalize`,
      snapshot,
      signal,
    );
  },

  getInterviewWsUrl(sessionId: string): string {
    return buildWsUrl(`/interviews/sessions/${encodeURIComponent(sessionId)}`);
  },
};
