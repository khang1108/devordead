import { apiGet, apiPost } from "@shared/services/apiClient";
import type { KnowledgeDomain, VoiceAnswerEvaluation, VoiceSessionData } from "@shared/types";

export interface KnowledgeTreeParams {
  role?: string;
  level?: string;
}

export interface EvaluateVoiceAnswerPayload {
  topicId: string;
  questionIndex: number;
  question: string;
  isFollowUp?: boolean;
  transcript?: string;
  audioBlob?: Blob;
  durationSec?: number;
}

export function getKnowledgeTree(
  params?: KnowledgeTreeParams,
  signal?: AbortSignal,
): Promise<KnowledgeDomain[]> {
  const qs = new URLSearchParams();
  if (params?.role) qs.set("role", params.role);
  if (params?.level) qs.set("level", params.level);
  const query = qs.toString();
  return apiGet<KnowledgeDomain[]>(query ? `/knowledge/tree?${query}` : "/knowledge/tree", signal);
}

export function getVoiceSession(topicId: string, signal?: AbortSignal): Promise<VoiceSessionData> {
  return apiGet<VoiceSessionData>(`/knowledge/topics/${encodeURIComponent(topicId)}/voice-session`, signal);
}

export function evaluateVoiceAnswer(
  payload: EvaluateVoiceAnswerPayload,
  signal?: AbortSignal,
): Promise<VoiceAnswerEvaluation> {
  if (payload.audioBlob) {
    const formData = new FormData();
    formData.append("topicId", payload.topicId);
    formData.append("questionIndex", String(payload.questionIndex));
    formData.append("question", payload.question);
    formData.append("isFollowUp", String(Boolean(payload.isFollowUp)));
    if (payload.transcript) {
      formData.append("transcript", payload.transcript);
    }
    if (typeof payload.durationSec === "number") {
      formData.append("durationSec", String(payload.durationSec));
    }
    formData.append("audio", payload.audioBlob, "answer.webm");
    return apiPost<VoiceAnswerEvaluation>("/knowledge/voice/evaluate", formData, signal);
  }

  return apiPost<VoiceAnswerEvaluation>(
    "/knowledge/voice/evaluate",
    {
      topicId: payload.topicId,
      questionIndex: payload.questionIndex,
      question: payload.question,
      isFollowUp: Boolean(payload.isFollowUp),
      transcript: payload.transcript ?? "",
      durationSec: payload.durationSec ?? 0,
    },
    signal,
  );
}

export const knowledgeService = {
  getKnowledgeTree,
  getVoiceSession,
  evaluateVoiceAnswer,
};
