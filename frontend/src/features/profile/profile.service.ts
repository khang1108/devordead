import { apiGet, apiPost, apiPut } from "@shared/services/apiClient";
import type { CvJdAnalysisResult, ExtractedSkill, TargetProfile } from "@shared/types";

export function getTargetProfile(signal?: AbortSignal): Promise<TargetProfile> {
  return apiGet<TargetProfile>("/profile/target", signal);
}

export function saveTargetProfile(profile: TargetProfile): Promise<TargetProfile> {
  return apiPut<TargetProfile>("/profile/target", profile);
}

export function analyzeCvJd(formData: FormData): Promise<CvJdAnalysisResult> {
  return apiPost<CvJdAnalysisResult>("/profile/cv-jd/analyze", formData);
}

export function saveSkills(skills: ExtractedSkill[]): Promise<{ skills: ExtractedSkill[] }> {
  return apiPut<{ skills: ExtractedSkill[] }>("/profile/skills", { skills });
}

export const profileService = {
  getTargetProfile,
  saveTargetProfile,
  analyzeCvJd,
  saveSkills,
};
