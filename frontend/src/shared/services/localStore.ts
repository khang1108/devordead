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
