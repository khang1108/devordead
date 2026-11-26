import { apiDelete, apiGet, apiPatch, apiPost } from "@shared/services/apiClient";
import type {
  CareerLevel,
  Difficulty,
  KnowledgeDomain,
  ModerationItem,
  ProcessedModerationItem,
  TaxonomyAuditEntry,
} from "@shared/types";

export type TaxonomyNodeKind = "family" | "role" | "domain" | "topic" | "competency";

export interface TaxonomyNodePayload {
  kind: TaxonomyNodeKind;
  parentId?: string | null;
  name: string;
  description?: string;
  level?: CareerLevel | "";
  roles?: string[];
  disabled?: boolean;
}

export interface ModerationDecisionPayload {
  title: string;
  content?: string;
  reference: string;
  criteria: string[];
  topic: string;
  competency: string;
  difficulty: Difficulty;
}

export const adminService = {
  getTaxonomy(signal?: AbortSignal): Promise<KnowledgeDomain[]> {
    return apiGet<KnowledgeDomain[]>("/admin/taxonomy", signal);
  },

  getTaxonomyLogs(signal?: AbortSignal): Promise<TaxonomyAuditEntry[]> {
    return apiGet<TaxonomyAuditEntry[]>("/admin/taxonomy/logs", signal);
  },

  createTaxonomyNode(
    payload: TaxonomyNodePayload,
    signal?: AbortSignal,
  ): Promise<{ id: string }> {
    return apiPost<{ id: string }>("/admin/taxonomy/nodes", payload, signal);
  },

  updateTaxonomyNode(
    id: string,
    payload: Partial<TaxonomyNodePayload>,
    signal?: AbortSignal,
  ): Promise<{ id: string }> {
    return apiPatch<{ id: string }>(
      `/admin/taxonomy/nodes/${encodeURIComponent(id)}`,
      payload,
      signal,
    );
  },

  deleteTaxonomyNode(id: string, signal?: AbortSignal): Promise<void> {
    return apiDelete<void>(`/admin/taxonomy/nodes/${encodeURIComponent(id)}`, signal);
  },

  reorderTaxonomyNodes(
    parentId: string | null,
    orderedIds: string[],
    signal?: AbortSignal,
  ): Promise<void> {
    return apiPatch<void>("/admin/taxonomy/reorder", { parentId, orderedIds }, signal);
  },

  getModerationQueue(signal?: AbortSignal): Promise<ModerationItem[]> {
    return apiGet<ModerationItem[]>("/admin/moderation/queue", signal);
  },

  getModerationHistory(signal?: AbortSignal): Promise<ProcessedModerationItem[]> {
    return apiGet<ProcessedModerationItem[]>("/admin/moderation/history", signal);
  },

  approveModerationItem(
    id: string,
    payload: ModerationDecisionPayload,
    signal?: AbortSignal,
  ): Promise<ProcessedModerationItem> {
    return apiPost<ProcessedModerationItem>(
      `/admin/moderation/${encodeURIComponent(id)}/approve`,
      payload,
      signal,
    );
  },

  rejectModerationItem(
    id: string,
    reason: string,
    signal?: AbortSignal,
  ): Promise<ProcessedModerationItem> {
    return apiPost<ProcessedModerationItem>(
      `/admin/moderation/${encodeURIComponent(id)}/reject`,
      { reason },
      signal,
    );
  },

  regenerateModerationItem(
    id: string,
    payload?: Partial<ModerationDecisionPayload>,
    signal?: AbortSignal,
  ): Promise<ModerationItem> {
    return apiPost<ModerationItem>(
      `/admin/moderation/${encodeURIComponent(id)}/regenerate`,
      payload ?? {},
      signal,
    );
  },
};
