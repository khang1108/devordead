import { apiGet, apiPost } from "@shared/services/apiClient";
import type { CodingProblem, ProgrammingLanguage, SandboxExecutionResult } from "@shared/types";

export function getProblems(signal?: AbortSignal): Promise<CodingProblem[]> {
  return apiGet<CodingProblem[]>("/problems", signal);
}

export function getProblemById(id: string, signal?: AbortSignal): Promise<CodingProblem> {
  return apiGet<CodingProblem>(`/problems/${encodeURIComponent(id)}`, signal);
}

export function runSampleTests(
  problemId: string,
  language: ProgrammingLanguage,
  code: string,
  signal?: AbortSignal,
): Promise<SandboxExecutionResult> {
  return apiPost<SandboxExecutionResult>(
    `/problems/${encodeURIComponent(problemId)}/run`,
    { language, code },
    signal,
  );
}

export function submitSolution(
  problemId: string,
  language: ProgrammingLanguage,
  code: string,
  signal?: AbortSignal,
): Promise<SandboxExecutionResult> {
  return apiPost<SandboxExecutionResult>(
    `/problems/${encodeURIComponent(problemId)}/submit`,
    { language, code },
    signal,
  );
}

export const codingService = {
  getProblems,
  getProblemById,
  runSampleTests,
  submitSolution,
};
