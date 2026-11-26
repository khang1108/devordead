export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

export type ProgressTone = "brand" | "success" | "warning" | "accent";

export type DeltaTone = "success" | "ink2" | "warning" | "accent" | "brand";

export type RuleCode =
  | "BR1"
  | "BR2"
  | "BR3"
  | "BR4"
  | "NFR01"
  | "NFR02"
  | "NFR03"
  | "NFR04"
  | "NFR05"
  | "NFR06"
  | "NFR07"
  | "NFR08"
  | "NFR09"
  | "NFR10";

export type Difficulty = "easy" | "medium" | "hard";

export type CareerLevel = "Intern" | "Fresher" | "Junior";

export type ProgrammingLanguage = "python" | "javascript" | "cpp" | "java";

export interface RoleFamily {
  family: string;
  roles: string[];
}

export interface LanguageOption {
  value: ProgrammingLanguage;
  label: string;
}

export interface LabeledToneMeta {
  label: string;
  tone: Tone;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
