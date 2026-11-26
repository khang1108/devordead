import type {
  CvFileMeta,
  ExtractedSkill,
  KnowledgeDomain,
  ModerationItem,
  ProcessedModerationItem,
  ProgrammingLanguage,
  SessionSnapshot,
  TargetProfile,
  TaxonomyAuditEntry,
  UserProfile,
} from "@shared/types";

const PREFIX = "devordead.v1";

function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(`${PREFIX}.${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(storage: Storage, key: string, value: T | null): void {
  try {
    const fullKey = `${PREFIX}.${key}`;
    if (value === null) {
      storage.removeItem(fullKey);
    } else {
      storage.setItem(fullKey, JSON.stringify(value));
    }
  } catch {
    // Ignore quota/private mode errors
  }
}

export const localStore = {
  getUser(): UserProfile | null {
    return readJson<UserProfile>(window.localStorage, "user");
  },
  setUser(user: UserProfile | null): void {
    writeJson(window.localStorage, "user", user);
  },

  getTargetProfile(): TargetProfile {
    return (
      readJson<TargetProfile>(window.localStorage, "targetProfile") ?? {
        role: "Backend",
        level: "Fresher",
        targetCompany: "",
      }
    );
  },
  setTargetProfile(profile: TargetProfile): void {
    writeJson(window.localStorage, "targetProfile", profile);
  },

  getCvDraft(): { file: CvFileMeta | null; jdText: string; skills: ExtractedSkill[] } {
    return (
      readJson<{ file: CvFileMeta | null; jdText: string; skills: ExtractedSkill[] }>(
        window.localStorage,
        "cvDraft",
      ) ?? { file: null, jdText: "", skills: [] }
    );
  },
  setCvDraft(draft: { file: CvFileMeta | null; jdText: string; skills: ExtractedSkill[] }): void {
    writeJson(window.localStorage, "cvDraft", draft);
  },

  getCodeDraft(problemId: string, lang: ProgrammingLanguage): string | null {
    return readJson<string>(window.localStorage, `code.${problemId}.${lang}`);
  },
  setCodeDraft(problemId: string, lang: ProgrammingLanguage, code: string): void {
    writeJson(window.localStorage, `code.${problemId}.${lang}`, code);
  },

  getEditorFontSize(): number {
    return readJson<number>(window.localStorage, "editor.fontSize") ?? 13.5;
  },
  setEditorFontSize(size: number): void {
    writeJson(window.localStorage, "editor.fontSize", size);
  },

  getEditorTheme(): "light" | "dark" {
    return readJson<"light" | "dark">(window.localStorage, "editor.theme") ?? "light";
  },
  setEditorTheme(theme: "light" | "dark"): void {
    writeJson(window.localStorage, "editor.theme", theme);
  },

  getSidebarCollapsed(): boolean {
    return readJson<boolean>(window.localStorage, "ui.sidebarCollapsed") ?? false;
  },
  setSidebarCollapsed(collapsed: boolean): void {
    writeJson(window.localStorage, "ui.sidebarCollapsed", collapsed);
  },

  getSplitRatio(key: string, fallback: number): number {
    const val = readJson<number>(window.localStorage, `split.${key}`);
    return typeof val === "number" && Number.isFinite(val) ? val : fallback;
  },
  setSplitRatio(key: string, ratio: number): void {
    writeJson(window.localStorage, `split.${key}`, ratio);
  },

  getPracticeDates(): string[] {
    return readJson<string[]>(window.localStorage, "study.practiceDates") ?? [];
  },
  recordTodayPractice(): string[] {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const existing = readJson<string[]>(window.localStorage, "study.practiceDates") ?? [];
    if (existing.includes(iso)) return existing;
    const next = [...existing, iso].slice(-90);
    writeJson(window.localStorage, "study.practiceDates", next);
    return next;
  },

  getLastSnapshot(): SessionSnapshot | null {
    return readJson<SessionSnapshot>(window.sessionStorage, "interview.lastSnapshot");
  },
  setLastSnapshot(snapshot: SessionSnapshot | null): void {
    writeJson(window.sessionStorage, "interview.lastSnapshot", snapshot);
  },

  getAdminTaxonomyDraft(): KnowledgeDomain[] | null {
    return readJson<KnowledgeDomain[]>(window.localStorage, "admin.taxonomy");
  },
  setAdminTaxonomyDraft(domains: KnowledgeDomain[]): void {
    writeJson(window.localStorage, "admin.taxonomy", domains);
  },

  getAdminTaxonomyLog(): TaxonomyAuditEntry[] {
    return readJson<TaxonomyAuditEntry[]>(window.localStorage, "admin.taxonomyLog") ?? [];
  },
  setAdminTaxonomyLog(entries: TaxonomyAuditEntry[]): void {
    writeJson(window.localStorage, "admin.taxonomyLog", entries);
  },

  getAdminModerationQueue(): ModerationItem[] | null {
    return readJson<ModerationItem[]>(window.localStorage, "admin.moderationQueue");
  },
  setAdminModerationQueue(items: ModerationItem[]): void {
    writeJson(window.localStorage, "admin.moderationQueue", items);
  },

  getAdminModerationHistory(): ProcessedModerationItem[] {
    return readJson<ProcessedModerationItem[]>(window.localStorage, "admin.moderationHistory") ?? [];
  },
  setAdminModerationHistory(items: ProcessedModerationItem[]): void {
    writeJson(window.localStorage, "admin.moderationHistory", items);
  },
};
