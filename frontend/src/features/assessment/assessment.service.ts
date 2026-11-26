import { apiGet, apiPost } from "@shared/services/apiClient";
import type {
  DashboardOverview,
  EvaluationReport,
  ReevaluationRequestPayload,
  ReevaluationResponse,
  RoadmapData,
} from "@shared/types";

export const assessmentService = {
  getDashboard(signal?: AbortSignal): Promise<DashboardOverview> {
    return apiGet<DashboardOverview>("/dashboard", signal);
  },

  getReports(signal?: AbortSignal): Promise<EvaluationReport[]> {
    return apiGet<EvaluationReport[]>("/reports", signal);
  },

  getReportById(id: string, signal?: AbortSignal): Promise<EvaluationReport> {
    return apiGet<EvaluationReport>(`/reports/${encodeURIComponent(id)}`, signal);
  },

  requestReevaluation(
    reportId: string,
    payload: ReevaluationRequestPayload,
    signal?: AbortSignal,
  ): Promise<ReevaluationResponse> {
    return apiPost<ReevaluationResponse>(
      `/reports/${encodeURIComponent(reportId)}/reevaluations`,
      payload,
      signal,
    );
  },

  getRoadmap(signal?: AbortSignal): Promise<RoadmapData> {
    return apiGet<RoadmapData>("/roadmap", signal);
  },
};
