import { apiGet, apiPost } from "@shared/services/apiClient";
import type { ExamEventType, ExamIntegrity, ExamSession } from "@shared/types";

export interface ExamEventPayload {
  type: ExamEventType;
  at: string;
  durationMs?: number;
  chars?: number;
}

export function startExam(problemId: string, durationMinutes: number, signal?: AbortSignal): Promise<ExamSession> {
  return apiPost<ExamSession>("/exam-sessions", { problemId, durationMinutes }, signal);
}

export function getExam(sessionId: string, signal?: AbortSignal): Promise<ExamSession> {
  return apiGet<ExamSession>(`/exam-sessions/${encodeURIComponent(sessionId)}`, signal);
}

export function sendExamEvents(
  sessionId: string,
  events: ExamEventPayload[],
): Promise<{ accepted: number; integrity: ExamIntegrity }> {
  return apiPost(`/exam-sessions/${encodeURIComponent(sessionId)}/events`, { events });
}

export function abandonExam(sessionId: string): Promise<ExamSession> {
  return apiPost<ExamSession>(`/exam-sessions/${encodeURIComponent(sessionId)}/abandon`);
}

export const examService = { startExam, getExam, sendExamEvents, abandonExam };
