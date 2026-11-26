import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LEVELS, ROLE_COMPETENCY_BLUEPRINT, ROLE_FAMILIES } from "@shared/constants";
import { getErrorMessage } from "@shared/services/apiClient";
import { localStore } from "@shared/services/localStore";
import type { CareerLevel, CvFileMeta, ExtractedSkill, SkillPriority } from "@shared/types";
import {
  Badge,
  Button,
  Callout,
  ErrorBanner,
  Field,
  PageHeader,
  ProgressBar,
  RuleTag,
  Segmented,
} from "@shared/ui";
import { profileService } from "./profile.service";
import "./ProfileScreen.css";

const MAX_CV_BYTES = 5 * 1024 * 1024;

const LEVEL_EXPECTATIONS: Record<CareerLevel, string> = {
  Intern:
    "Trọng tâm kiểm tra nền tảng khoa học máy tính, độ vững cú pháp và tư duy giải thích rõ từng bước.",
  Fresher:
    "Kỳ vọng viết code sạch qua được bộ test biên trong sandbox, hiểu trade-off kỹ thuật và trình bày mạch lạc.",
  Junior:
    "Đòi hỏi phân tích sâu hiệu năng (EXPLAIN, Big-O bộ nhớ), xử lý race condition và thiết kế thành phần độc lập.",
};

const LEVEL_BASE_TARGET: Record<CareerLevel, number> = {
  Intern: 0.65,
  Fresher: 0.78,
  Junior: 0.9,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isValidCvFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const extOk = name.endsWith(".pdf") || name.endsWith(".docx");
  return extOk && file.size <= MAX_CV_BYTES;
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialTarget = localStore.getTargetProfile();
  const initialDraft = localStore.getCvDraft();

  // Cột trái: Vị trí & cấp độ (UC02)
  const [role, setRole] = useState<string>(initialTarget.role);
  const [level, setLevel] = useState<CareerLevel>(initialTarget.level);
  const [targetCompany, setTargetCompany] = useState<string>(initialTarget.targetCompany ?? "");
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  // Cột phải: CV & JD (UC03)
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvMeta, setCvMeta] = useState<CvFileMeta | null>(initialDraft.file);
  const [cvError, setCvError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [jdText, setJdText] = useState<string>(initialDraft.jdText);
  const [jdError, setJdError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [skills, setSkills] = useState<ExtractedSkill[]>(initialDraft.skills);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillPriority, setNewSkillPriority] = useState<SkillPriority>("required");
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsSaved, setSkillsSaved] = useState(false);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  // Đồng bộ nhẹ hồ sơ mục tiêu từ API nếu Backend đang hoạt động
  useEffect(() => {
    const controller = new AbortController();
    void profileService
      .getTargetProfile(controller.signal)
      .then((remote) => {
        if (remote.role) setRole(remote.role);
        if (remote.level) setLevel(remote.level);
        if (typeof remote.targetCompany === "string") setTargetCompany(remote.targetCompany);
        localStore.setTargetProfile(remote);
      })
      .catch(() => {
        // Giữ nguyên dữ liệu đã lưu cục bộ khi máy chủ API chưa sẵn sàng
      });
    return () => controller.abort();
  }, []);

  const persistTargetLocal = (
    nextRole: string,
    nextLevel: CareerLevel,
    nextCompany = targetCompany,
  ) => {
    localStore.setTargetProfile({
      role: nextRole,
      level: nextLevel,
      targetCompany: nextCompany,
    });
  };

  const persistCvDraftLocal = (
    nextFile: CvFileMeta | null,
    nextJd: string,
    nextSkills: ExtractedSkill[],
  ) => {
    localStore.setCvDraft({
      file: nextFile,
      jdText: nextJd,
      skills: nextSkills,
    });
  };

  const handleRoleSelect = (nextRole: string) => {
    setRole(nextRole);
    setTargetSaved(false);
    setTargetError(null);
    persistTargetLocal(nextRole, level);
  };

  const handleLevelSelect = (nextLevel: CareerLevel) => {
    setLevel(nextLevel);
    setTargetSaved(false);
    setTargetError(null);
    persistTargetLocal(role, nextLevel);
  };

  const handleCompanyChange = (nextCompany: string) => {
    setTargetCompany(nextCompany);
    setTargetSaved(false);
    setTargetError(null);
    persistTargetLocal(role, level, nextCompany);
  };

  const handleSaveTarget = async () => {
    setSavingTarget(true);
    setTargetSaved(false);
    setTargetError(null);
    const payload = { role, level, targetCompany: targetCompany.trim() };
    persistTargetLocal(role, level, payload.targetCompany);

    try {
      const updated = await profileService.saveTargetProfile(payload);
      localStore.setTargetProfile(updated);
      setTargetSaved(true);
    } catch (err) {
      setTargetError(getErrorMessage(err, "Không thể đồng bộ hồ sơ mục tiêu lên máy chủ."));
    } finally {
      setSavingTarget(false);
    }
  };

  const applyCvFile = (file: File | undefined) => {
    if (!file) return;
    if (!isValidCvFile(file)) {
      setCvFile(null);
      setCvMeta(null);
      persistCvDraftLocal(null, jdText, skills);
      setCvError("Tệp không hợp lệ. Chỉ chấp nhận .pdf hoặc .docx, dung lượng ≤ 5MB.");
      return;
    }
    const meta: CvFileMeta = {
      name: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    };
    setCvError("");
    setJdError("");
    setAnalyzeError(null);
    setSkillsSaved(false);
    setCvFile(file);
    setCvMeta(meta);
    persistCvDraftLocal(meta, jdText, skills);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    applyCvFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    applyCvFile(file);
  };

  const handleRemoveCv = () => {
    setCvFile(null);
    setCvMeta(null);
    setCvError("");
    setAnalyzeError(null);
    persistCvDraftLocal(null, jdText, skills);
  };

  const handleJdChange = (nextJd: string) => {
    setJdText(nextJd);
    if (jdError) setJdError("");
    if (analyzeError) setAnalyzeError(null);
    setSkillsSaved(false);
    persistCvDraftLocal(cvMeta, nextJd, skills);
  };

  const handleAnalyze = async () => {
    setSkillsSaved(false);
    setAnalyzeError(null);
    setAnalysisSummary(null);

    if (!jdText.trim() && !cvFile && !cvMeta) {
      setJdError("Dán nội dung JD hoặc tải CV trước.");
      return;
    }

    if (!jdText.trim() && !cvFile && cvMeta) {
      setCvError("Vui lòng chọn lại tệp CV từ máy để gửi lên máy chủ phân tích.");
      return;
    }

    setJdError("");
    setAnalyzing(true);

    const formData = new FormData();
    if (cvFile) {
      formData.append("cv", cvFile);
    }
    if (jdText.trim()) {
      formData.append("jd", jdText.trim());
    }
    formData.append("role", role);
    formData.append("level", level);

    try {
      const result = await profileService.analyzeCvJd(formData);
      setSkills(result.skills);
      setAnalysisSummary(result.summary ?? null);
      persistCvDraftLocal(cvMeta, jdText, result.skills);
    } catch (err) {
      setAnalyzeError(
        getErrorMessage(
          err,
          "Không thể phân tích CV/JD qua máy chủ AI. Bạn vẫn có thể thêm kỹ năng thủ công ở mục bên dưới.",
        ),
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemoveSkill = (id: string) => {
    const next = skills.filter((s) => s.id !== id);
    setSkills(next);
    setSkillsSaved(false);
    setSkillsError(null);
    persistCvDraftLocal(cvMeta, jdText, next);
  };

  const handleAddSkill = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;

    const exists = skills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setNewSkillName("");
      return;
    }

    const next: ExtractedSkill[] = [
      ...skills,
      {
        id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: trimmed,
        status: "missing",
        priority: newSkillPriority,
      },
    ];
    setSkills(next);
    setNewSkillName("");
    setSkillsSaved(false);
    setSkillsError(null);
    persistCvDraftLocal(cvMeta, jdText, next);
  };

  const handleConfirmSkills = async () => {
    setSavingSkills(true);
    setSkillsSaved(false);
    setSkillsError(null);
    persistCvDraftLocal(cvMeta, jdText, skills);

    try {
      const result = await profileService.saveSkills(skills);
      setSkills(result.skills);
      persistCvDraftLocal(cvMeta, jdText, result.skills);
      setSkillsSaved(true);
    } catch (err) {
      setSkillsError(getErrorMessage(err, "Không thể lưu danh sách kỹ năng lên máy chủ."));
    } finally {
      setSavingSkills(false);
    }
  };

  const competencyNames = ROLE_COMPETENCY_BLUEPRINT[role] ?? ROLE_COMPETENCY_BLUEPRINT.Backend ?? [];
  const baseTarget = LEVEL_BASE_TARGET[level];
  const matchedCount = skills.filter((s) => s.status === "matched").length;
  const missingCount = skills.length - matchedCount;

  return (
    <div className="col stack-lg prof-screen">
      <PageHeader
        eyebrow="Hồ sơ mục tiêu"
        title="Bạn đang nhắm tới đâu?"
        subtitle="Thiết lập vị trí, cấp độ và phân tích CV/JD để hệ thống cá nhân hóa kho tri thức cùng lộ trình luyện tập."
        actions={<RuleTag code="UC02 · UC03">Cá nhân hóa lộ trình</RuleTag>}
      />

      <div className="prof-grid">
        {/* Cột trái: Vị trí & cấp độ (UC02) */}
        <section className="lc-pane prof-pane" aria-label="Thiết lập vị trí và cấp độ mục tiêu">
          <div className="lc-pane__head">
            <span className="prof-pane-title">Vị trí &amp; cấp độ</span>
            <Badge tone="brand" dot>
              {role} · {level}
            </Badge>
          </div>

          <div className="lc-pane__body prof-pane-body">
            {ROLE_FAMILIES.map((group) => (
              <div key={group.family} className="prof-group">
                <p className="prof-group__label">{group.family}</p>
                <div className="lc-pills" role="group" aria-label={group.family}>
                  {group.roles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`lc-pill ${role === r ? "is-active" : ""}`.trim()}
                      aria-pressed={role === r}
                      onClick={() => handleRoleSelect(r)}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="prof-group">
              <p className="prof-group__label">Cấp độ mục tiêu</p>
              <Segmented
                options={LEVELS}
                value={level}
                onChange={handleLevelSelect}
                label="Cấp độ mục tiêu"
              />
            </div>

            <Field
              label="Công ty mục tiêu (tùy chọn)"
              placeholder="Vd: VNG, Shopee, Grab, Techcombank..."
              value={targetCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
            />

            {/* Khung xem trước trọng tâm năng lực */}
            <div className="prof-section" aria-label="Khung năng lực trọng tâm theo mục tiêu">
              <div className="row between wrap">
                <span className="prof-group__label">Trọng tâm đánh giá dự kiến</span>
                <span className="t-body-s c-ink2">
                  {competencyNames.length} nhóm năng lực cốt lõi
                </span>
              </div>

              <ul className="rows prof-pillars">
                {competencyNames.map((name, idx) => {
                  const calibrated = Math.max(0.45, Math.min(0.95, baseTarget - idx * 0.04));
                  return (
                    <li key={name} className="prof-pillar">
                      <div className="row between">
                        <span className="t-body-s t-strong">{name}</span>
                        <span className="t-mono c-ink2">{Math.round(calibrated * 100)}%</span>
                      </div>
                      <div className="prof-bar-wrap">
                        <ProgressBar value={calibrated} label={name} />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <p className="t-body-s c-ink2">{LEVEL_EXPECTATIONS[level]}</p>
            </div>

            <Callout tone="brand">
              Lộ trình sẽ được khởi tạo cho{" "}
              <strong>
                {role} · {level}
              </strong>
              , tự động lọc cây kiến thức và ngân hàng bài tập sát với cấp độ bạn chọn.
            </Callout>

            {targetSaved && (
              <Callout tone="success" role="status">
                <strong>Đã lưu. Lộ trình đã được cập nhật.</strong> Bạn có thể tiếp tục gắn CV/JD
                bên phải hoặc bắt đầu luyện tập ngay.
              </Callout>
            )}

            {targetError && (
              <ErrorBanner
                title="Đã lưu cục bộ — chưa đồng bộ được máy chủ"
                message={targetError}
                onRetry={() => void handleSaveTarget()}
              />
            )}
          </div>

          <div className="lc-pane__foot prof-pane-foot">
            <div className="row wrap stack-sm">
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleSaveTarget()}
                disabled={savingTarget}
              >
                {savingTarget && <span className="spinner" aria-hidden="true" />}
                Lưu hồ sơ mục tiêu
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                Để sau
              </Button>
            </div>
            <span className="t-mono c-ink2">UC02</span>
          </div>
        </section>

        {/* Cột phải: CV & JD (UC03) */}
        <section className="lc-pane prof-pane" aria-label="Tải lên CV và phân tích JD">
          <div className="lc-pane__head">
            <span className="prof-pane-title">CV &amp; JD</span>
            <RuleTag code="NFR04">Mã hóa khi lưu</RuleTag>
          </div>

          <div className="lc-pane__body prof-pane-body">
            <div className="prof-group">
              <label className="field__label" htmlFor="prof-cv-input">
                Tệp CV (.pdf hoặc .docx, tối đa 5MB)
              </label>

              <div
                className={`prof-dropzone ${isDragging ? "is-dragging" : ""} ${cvMeta ? "has-file" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  id="prof-cv-input"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  onChange={handleFileChange}
                />

                {cvMeta ? (
                  <div className="prof-file-row">
                    <div className="prof-file-meta">
                      <span className="t-mono prof-file-ext">CV</span>
                      <span className="prof-file-name">{cvMeta.name}</span>
                      <span className="t-mono c-ink2">{formatFileSize(cvMeta.sizeBytes)}</span>
                    </div>
                    <div className="row prof-gap-sm">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Đổi tệp
                      </Button>
                      <button
                        type="button"
                        className="prof-remove-btn"
                        aria-label="Xóa tệp CV"
                        onClick={handleRemoveCv}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="prof-dropzone__empty">
                    <span className="t-body-s c-ink2">
                      Kéo thả tệp CV vào đây hoặc chọn từ máy tính (chỉ dùng làm ngữ cảnh cá nhân
                      hóa).
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Chọn tệp CV
                    </Button>
                  </div>
                )}

                {cvError && (
                  <p className="field__error" role="alert">
                    {cvError}
                  </p>
                )}
              </div>
            </div>

            <div className="prof-jd-wrap">
              {jdText.trim() && (
                <div className="prof-jd-tools">
                  <button
                    type="button"
                    className="prof-inline-action"
                    onClick={() => handleJdChange("")}
                  >
                    Xóa JD
                  </button>
                </div>
              )}

              <Field
                multiline
                label="Nội dung JD (Mô tả công việc)"
                placeholder="Dán nội dung JD tại đây để AI đối chiếu kỹ năng đã có và khoảng trống cần bù đắp..."
                value={jdText}
                onChange={(e) => handleJdChange(e.target.value)}
                error={jdError}
              />
            </div>

            <div className="row between wrap">
              <Button
                variant="primary"
                size="sm"
                onClick={() => void handleAnalyze()}
                disabled={analyzing}
              >
                {analyzing && <span className="spinner" aria-hidden="true" />}
                {analyzing ? "Đang trích xuất kỹ năng…" : "Phân tích CV/JD"}
              </Button>
              <span className="t-mono c-ink2">AES-256 · HTTPS</span>
            </div>

            {analyzeError && (
              <ErrorBanner
                title="Không thể phân tích CV/JD qua máy chủ AI"
                message={analyzeError}
                onRetry={() => void handleAnalyze()}
              />
            )}

            {analysisSummary && <Callout tone="brand">{analysisSummary}</Callout>}

            <div className="prof-section">
              <div className="row between wrap">
                <span className="prof-group__label">Kỹ năng mục tiêu ({skills.length})</span>
                {skills.length > 0 && (
                  <div className="row wrap prof-gap-sm">
                    <span className="lc-diff lc-diff--easy">{matchedCount} khớp CV</span>
                    <span className="t-body-s c-ink2" aria-hidden="true">
                      ·
                    </span>
                    <span className="lc-diff lc-diff--medium">{missingCount} thiếu trong CV</span>
                  </div>
                )}
              </div>

              {skills.length === 0 ? (
                <p className="t-body-s c-ink2">
                  Chưa có kỹ năng nào trong danh sách. Hãy bấm <strong>Phân tích CV/JD</strong> hoặc
                  tự thêm kỹ năng thủ công ở bên dưới.
                </p>
              ) : (
                <div className="lc-list prof-skills-list" role="list">
                  {skills.map((skill) => {
                    const isMatched = skill.status === "matched";
                    return (
                      <div key={skill.id} role="listitem" className="lc-list__row prof-skill-row">
                        <div className="prof-skill-main">
                          <span className="prof-skill-name">{skill.name}</span>
                          <span
                            className={`lc-diff ${isMatched ? "lc-diff--easy" : "lc-diff--medium"}`}
                          >
                            {isMatched ? "Khớp CV" : "Thiếu trong CV"}
                          </span>
                        </div>
                        <div className="prof-skill-actions">
                          <span className="prof-skill-priority">
                            {skill.priority === "required" ? "Bắt buộc" : "Ưu tiên"}
                          </span>
                          <button
                            type="button"
                            className="prof-remove-btn"
                            aria-label={`Xóa kỹ năng ${skill.name}`}
                            onClick={() => handleRemoveSkill(skill.id)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <form className="prof-add-row" onSubmit={handleAddSkill}>
                <Field
                  label="Thêm kỹ năng thủ công"
                  placeholder="Vd: Kafka, GraphQL, Docker..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
                <div className="field">
                  <label className="field__label" htmlFor="prof-skill-priority">
                    Mức độ JD
                  </label>
                  <select
                    id="prof-skill-priority"
                    className="select"
                    value={newSkillPriority}
                    onChange={(e) => setNewSkillPriority(e.target.value as SkillPriority)}
                  >
                    <option value="required">Bắt buộc</option>
                    <option value="preferred">Ưu tiên</option>
                  </select>
                </div>
                <Button type="submit" variant="secondary">
                  Thêm
                </Button>
              </form>

              {skillsSaved && (
                <Callout tone="success" role="status">
                  <div className="row between wrap">
                    <span>
                      <strong>Đã xác nhận &amp; lưu</strong> danh sách kỹ năng cùng ngữ cảnh CV/JD
                      được mã hóa.
                    </span>
                    <Link to="/roadmap" className="t-strong">
                      Xem lộ trình học →
                    </Link>
                  </div>
                </Callout>
              )}

              {skillsError && (
                <ErrorBanner
                  title="Đã lưu cục bộ — chưa đồng bộ danh sách kỹ năng"
                  message={skillsError}
                  onRetry={() => void handleConfirmSkills()}
                />
              )}
            </div>
          </div>

          <div className="lc-pane__foot prof-pane-foot">
            <Button
              variant="accent"
              size="sm"
              onClick={() => void handleConfirmSkills()}
              disabled={savingSkills || skills.length === 0}
            >
              {savingSkills && <span className="spinner" aria-hidden="true" />}
              Xác nhận &amp; lưu
            </Button>
            <span className="t-mono c-ink2">UC03 · NFR04</span>
          </div>
        </section>
      </div>
    </div>
  );
}
