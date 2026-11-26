import type { CareerLevel } from "./common";

export type UserRoleType = "candidate" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  subtitle: string;
  email: string;
  accountRole: UserRoleType;
  role: string;
  level: CareerLevel;
  targetCompany?: string;
  interviewInDays?: number | null;
  streakDays: number;
}

export interface AuthSession {
  accessToken: string;
  tokenType: "Bearer";
  user: UserProfile;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export type OAuthProvider = "google" | "github";

export interface TargetProfile {
  role: string;
  level: CareerLevel;
  targetCompany?: string;
}

export interface CvFileMeta {
  name: string;
  sizeBytes: number;
  uploadedAt: string;
}

export type SkillMatchStatus = "matched" | "missing";

export type SkillPriority = "required" | "preferred";

export interface ExtractedSkill {
  id: string;
  name: string;
  status: SkillMatchStatus;
  priority: SkillPriority;
}

export interface CvJdAnalysisResult {
  skills: ExtractedSkill[];
  summary?: string;
  analyzedAt: string;
}
