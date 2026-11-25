import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHead,
  Chip,
  Field,
  PageHeader,
  ProgressBar,
  RuleTag,
  Segmented,
} from "../components/ui.jsx";
import { LEVELS, ROLE_FAMILIES } from "../data/mock.js";
import "./ProfileScreen.css";

const MAX_CV_BYTES = 5 * 1024 * 1024;

const SAMPLE_JD_TEXT = `Vị trí: Backend Engineer (Fresher) — ACME Tech
Mô tả & Yêu cầu kỹ thuật:
- Phát triển và tối ưu REST API với Node.js (TypeScript/JavaScript), nắm vững HTTP status & idempotency.
- Thiết kế schema và tối ưu truy vấn PostgreSQL (B-Tree index, composite index, đọc EXPLAIN ANALYZE).
- Ưu tiên ứng viên từng đóng gói ứng dụng bằng Docker, hiểu cơ chế caching với Redis và nắm System Design cơ bản.`;

const ROLE_BLUEPRINTS = {
  Backend: {
    topics: 18,
    problems: 24,
    pillars: [
      { name: "Cơ sở dữ liệu & Indexing", weight: 0.9 },
      { name: "HTTP, REST & Idempotency", weight: 0.85 },
      { name: "Cấu trúc dữ liệu & Giải thuật", weight: 0.8 },
      { name: "Caching & System Design cơ bản", weight: 0.65 },
    ],
  },
  Frontend: {
    topics: 16,
    problems: 20,
    pillars: [
      { name: "JavaScript Runtime & Event Loop", weight: 0.9 },
      { name: "Kiến trúc State & Rendering", weight: 0.85 },
      { name: "Mạng, HTTP Caching & Web Vitals", weight: 0.75 },
      { name: "Cấu trúc dữ liệu mảng, chuỗi & cây", weight: 0.7 },
    ],
  },
  Fullstack: {
    topics: 22,
    problems: 26,
    pillars: [
      { name: "Thiết kế REST API & Xác thực", weight: 0.88 },
      { name: "PostgreSQL, Transaction & ACID", weight: 0.82 },
      { name: "Frontend State & Tích hợp bất đồng bộ", weight: 0.78 },
      { name: "Giải thuật & Tối ưu độ phức tạp", weight: 0.75 },
    ],
  },
  Mobile: {
    topics: 15,
    problems: 18,
    pillars: [
      { name: "Vòng đời ứng dụng & Quản lý bộ nhớ", weight: 0.88 },
      { name: "Luồng UI, Concurrency & Offline Sync", weight: 0.82 },
      { name: "Giao tiếp REST API & Bảo mật Token", weight: 0.75 },
      { name: "Cấu trúc dữ liệu & Giải thuật cốt lõi", weight: 0.72 },
    ],
  },
  "AI Engineer": {
    topics: 17,
    problems: 21,
    pillars: [
      { name: "LLM Pipeline, RAG & Vector Indexing", weight: 0.9 },
      { name: "Đánh giá mô hình, Độ trễ & Guardrails", weight: 0.84 },
      { name: "Python Backend & Xử lý bất đồng bộ", weight: 0.78 },
      { name: "Giải thuật đồ thị, Heap & Quy hoạch động", weight: 0.74 },
    ],
  },
  "Data Engineer": {
    topics: 18,
    problems: 20,
    pillars: [
      { name: "SQL chuyên sâu, Partitioning & Indexing", weight: 0.92 },
      { name: "Thiết kế ETL Batch & Streaming", weight: 0.85 },
      { name: "Data Modeling & Kho dữ liệu", weight: 0.8 },
      { name: "Cấu trúc dữ liệu Python & Tối ưu bộ nhớ", weight: 0.72 },
    ],
  },
  "Data Analyst": {
    topics: 14,
    problems: 15,
    pillars: [
      { name: "Truy vấn SQL phân tích & Window Functions", weight: 0.92 },
      { name: "Chỉ số sản phẩm, Funnel & Cohort", weight: 0.84 },
      { name: "Xác suất thống kê & Kiểm định A/B", weight: 0.76 },
      { name: "Trình bày insight theo cấu trúc STAR", weight: 0.74 },
    ],
  },
};

const LEVEL_EXPECTATIONS = {
  Intern: "Trọng tâm kiểm tra nền tảng khoa học máy tính, độ vững cú pháp và tư duy giải thích rõ từng bước.",
  Fresher: "Kỳ vọng viết code sạch qua được bộ test biên trong sandbox, hiểu trade-off kỹ thuật và trình bày mạch lạc.",
  Junior: "Đòi hỏi phân tích sâu hiệu năng (EXPLAIN, Big-O bộ nhớ), xử lý race condition và thiết kế thành phần độc lập.",
};

const EXTRACTED_SKILLS_MOCK = [
  { id: "sk-1", name: "Node.js", matched: true, level: "Bắt buộc" },
  { id: "sk-2", name: "PostgreSQL", matched: true, level: "Bắt buộc" },
  { id: "sk-3", name: "REST API", matched: true, level: "Bắt buộc" },
  { id: "sk-4", name: "Docker", matched: false, level: "Ưu tiên" },
  { id: "sk-5", name: "Redis", matched: false, level: "Ưu tiên" },
  { id: "sk-6", name: "System Design cơ bản", matched: false, level: "Ưu tiên" },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isValidCvFile(file) {
  const name = file.name.toLowerCase();
  const extOk = name.endsWith(".pdf") || name.endsWith(".docx");
  return extOk && file.size <= MAX_CV_BYTES;
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const timersRef = useRef([]);

  // Cột trái: Vị trí & cấp độ (UC02)
  const [role, setRole] = useState("Backend");
  const [level, setLevel] = useState("Fresher");
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);

  // Cột phải: CV & JD (UC03)
  const [cvFile, setCvFile] = useState(null);
  const [cvError, setCvError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [jdText, setJdText] = useState("");
  const [jdError, setJdError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [skills, setSkills] = useState(null);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("Bắt buộc");
  const [savingSkills, setSavingSkills] = useState(false);
  const [skillsSaved, setSkillsSaved] = useState(false);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => clearTimeout(id));
    };
  }, []);

  const schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const handleSaveTarget = () => {
    setSavingTarget(true);
    setTargetSaved(false);
    schedule(() => {
      setSavingTarget(false);
      setTargetSaved(true);
    }, 800);
  };

  const applyCvFile = (file) => {
    if (!file) return;
    if (!isValidCvFile(file)) {
      setCvFile(null);
      setCvError("Tệp không hợp lệ. Chỉ chấp nhận .pdf hoặc .docx, dung lượng ≤ 5MB.");
      return;
    }
    setCvError("");
    setJdError("");
    setSkillsSaved(false);
    setCvFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    applyCvFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files?.[0];
    applyCvFile(file);
  };

  const handleUseMockCv = () => {
    setCvError("");
    setJdError("");
    setSkillsSaved(false);
    setCvFile({
      name: "Nguyen_Minh_Anh_Backend_Fresher_CV.pdf",
      size: 428 * 1024,
    });
  };

  const handleFillSampleJd = () => {
    setJdText(SAMPLE_JD_TEXT);
    setJdError("");
    setSkillsSaved(false);
  };

  const handleAnalyze = () => {
    setSkillsSaved(false);
    if (!jdText.trim() && !cvFile) {
      setJdError("Dán nội dung JD hoặc tải CV trước.");
      return;
    }

    setJdError("");
    setAnalyzing(true);
    schedule(() => {
      setAnalyzing(false);
      setSkills(EXTRACTED_SKILLS_MOCK.map((s) => ({ ...s })));
    }, 950);
  };

  const handleRemoveSkill = (id) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setSkillsSaved(false);
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkillName.trim();
    if (!trimmed) return;

    setSkills((prev) => {
      const list = prev ?? [];
      const exists = list.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
      if (exists) return list;
      return [
        ...list,
        {
          id: `sk-${Date.now()}`,
          name: trimmed,
          matched: false,
          level: newSkillLevel,
        },
      ];
    });
    setNewSkillName("");
    setSkillsSaved(false);
  };

  const handleConfirmSkills = () => {
    setSavingSkills(true);
    setSkillsSaved(false);
    schedule(() => {
      setSavingSkills(false);
      setSkillsSaved(true);
    }, 800);
  };

  const blueprint = ROLE_BLUEPRINTS[role] ?? ROLE_BLUEPRINTS.Backend;
  const levelMultiplier = level === "Intern" ? -0.1 : level === "Junior" ? 0.06 : 0;
  const matchedCount = skills ? skills.filter((s) => s.matched).length : 0;
  const missingCount = skills ? skills.length - matchedCount : 0;

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
        <Card className="prof-card">
          <CardHead title="Vị trí & cấp độ">
            <Badge tone="brand">{role} · {level}</Badge>
          </CardHead>

          {ROLE_FAMILIES.map((group) => (
            <div key={group.family} className="prof-group">
              <p className="prof-group__label">{group.family}</p>
              <div className="row wrap prof-chips">
                {group.roles.map((r) => (
                  <Chip
                    key={r}
                    active={role === r}
                    onClick={() => {
                      setRole(r);
                      setTargetSaved(false);
                    }}
                  >
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          ))}

          <div className="prof-group">
            <p className="prof-group__label">Cấp độ mục tiêu</p>
            <Segmented
              options={LEVELS}
              value={level}
              onChange={(val) => {
                setLevel(val);
                setTargetSaved(false);
              }}
              label="Cấp độ mục tiêu"
            />
          </div>

          {/* Khung xem trước trọng tâm năng lực phân cách bằng vạch mảnh 1px (không bọc hộp xám lồng nhau) */}
          <div className="prof-section" aria-label="Khung năng lực trọng tâm theo mục tiêu">
            <div className="row between wrap">
              <span className="prof-group__label">Trọng tâm đánh giá dự kiến</span>
              <span className="t-body-s c-ink2">
                {blueprint.topics} chủ đề · {blueprint.problems} bài tập
              </span>
            </div>

            <ul className="rows prof-pillars">
              {blueprint.pillars.map((pillar) => {
                const calibrated = Math.max(0.35, Math.min(0.98, pillar.weight + levelMultiplier));
                return (
                  <li key={pillar.name} className="prof-pillar">
                    <div className="row between">
                      <span className="t-body-s t-strong">{pillar.name}</span>
                      <span className="t-mono c-ink2">{Math.round(calibrated * 100)}%</span>
                    </div>
                    <ProgressBar value={calibrated} label={pillar.name} />
                  </li>
                );
              })}
            </ul>

            <p className="t-body-s c-ink2">{LEVEL_EXPECTATIONS[level]}</p>
          </div>

          <Callout tone="brand">
            Lộ trình sẽ được khởi tạo cho <strong>{role} · {level}</strong>, tự động lọc cây kiến thức và ngân hàng bài tập sát với cấp độ bạn chọn.
          </Callout>

          {targetSaved && (
            <Callout tone="success" role="status">
              <strong>Đã lưu. Lộ trình đã được cập nhật.</strong> Bạn có thể tiếp tục gắn CV/JD bên phải hoặc bắt đầu luyện tập ngay.
            </Callout>
          )}

          <div className="row wrap">
            <Button variant="primary" onClick={handleSaveTarget} disabled={savingTarget}>
              {savingTarget && <span className="spinner" aria-hidden="true" />}
              Lưu hồ sơ mục tiêu
            </Button>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              Để sau
            </Button>
          </div>
        </Card>

        {/* Cột phải: CV & JD (UC03) */}
        <Card className="prof-card">
          <CardHead title="CV & JD">
            <RuleTag code="NFR04">Mã hóa khi lưu</RuleTag>
          </CardHead>

          <div className="prof-group">
            <div className="row between wrap">
              <label className="field__label" htmlFor="prof-cv-input">
                Tệp CV (.pdf hoặc .docx, tối đa 5MB)
              </label>
              {!cvFile && (
                <button type="button" className="prof-inline-action" onClick={handleUseMockCv}>
                  + Gắn CV mẫu
                </button>
              )}
            </div>

            <div
              className={`prof-dropzone ${isDragging ? "is-dragging" : ""} ${cvFile ? "has-file" : ""}`}
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

              {cvFile ? (
                <div className="prof-file-row">
                  <div className="prof-file-meta">
                    <span className="t-mono prof-file-ext">CV</span>
                    <span className="prof-file-name">{cvFile.name}</span>
                    <span className="t-mono c-ink2">{formatFileSize(cvFile.size)}</span>
                  </div>
                  <div className="row" style={{ "--gap": "6px" }}>
                    <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                      Đổi tệp
                    </Button>
                    <button
                      type="button"
                      className="prof-remove-btn"
                      aria-label="Xóa tệp CV"
                      onClick={() => {
                        setCvFile(null);
                        setCvError("");
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prof-dropzone__empty">
                  <span className="t-body-s c-ink2">
                    Kéo thả tệp CV vào đây hoặc chọn từ máy tính (chỉ dùng làm ngữ cảnh cá nhân hóa).
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
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
            <div className="prof-jd-tools">
              {jdText.trim() ? (
                <button
                  type="button"
                  className="prof-inline-action"
                  onClick={() => {
                    setJdText("");
                    setSkillsSaved(false);
                  }}
                >
                  Xóa JD
                </button>
              ) : (
                <button type="button" className="prof-inline-action" onClick={handleFillSampleJd}>
                  + Điền JD mẫu (ACME Tech)
                </button>
              )}
            </div>

            <Field
              multiline
              label="Nội dung JD (Mô tả công việc)"
              placeholder="Dán nội dung JD tại đây để AI đối chiếu kỹ năng đã có và khoảng trống cần bù đắp..."
              value={jdText}
              onChange={(e) => {
                setJdText(e.target.value);
                if (jdError) setJdError("");
              }}
              error={jdError}
            />
          </div>

          <div className="row between wrap">
            <Button variant="primary" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing && <span className="spinner" aria-hidden="true" />}
              {analyzing ? "Đang trích xuất kỹ năng…" : "Phân tích CV/JD"}
            </Button>
            <span className="t-mono c-ink2">AES-256 · HTTPS</span>
          </div>

          {skills !== null && (
            <div className="prof-section">
              <div className="row between wrap">
                <span className="prof-group__label">Kỹ năng trích xuất ({skills.length})</span>
                <div className="row wrap" style={{ "--gap": "6px" }}>
                  <Badge tone="success">{matchedCount} khớp CV</Badge>
                  <Badge tone="warning">{missingCount} thiếu trong CV</Badge>
                </div>
              </div>

              {skills.length === 0 ? (
                <p className="t-body-s c-ink2">
                  Chưa có kỹ năng nào trong danh sách. Hãy thêm kỹ năng thủ công ở dưới hoặc phân tích lại.
                </p>
              ) : (
                <ul className="rows prof-skills-list">
                  {skills.map((skill) => (
                    <li key={skill.id} className="prof-skill-row">
                      <div className="prof-skill-main">
                        <span className="prof-skill-name">{skill.name}</span>
                        <Badge tone={skill.matched ? "success" : "warning"}>
                          {skill.matched ? "Khớp CV" : "Thiếu trong CV"}
                        </Badge>
                      </div>
                      <div className="prof-skill-actions">
                        <span className="prof-skill-priority">{skill.level}</span>
                        <button
                          type="button"
                          className="prof-remove-btn"
                          aria-label={`Xóa kỹ năng ${skill.name}`}
                          onClick={() => handleRemoveSkill(skill.id)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <form className="prof-add-row" onSubmit={handleAddSkill}>
                <Field
                  label="Thêm kỹ năng thủ công"
                  placeholder="Vd: Kafka, GraphQL..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
                <div className="field">
                  <label className="field__label" htmlFor="prof-skill-level">
                    Mức độ JD
                  </label>
                  <select
                    id="prof-skill-level"
                    className="select"
                    value={newSkillLevel}
                    onChange={(e) => setNewSkillLevel(e.target.value)}
                  >
                    <option value="Bắt buộc">Bắt buộc</option>
                    <option value="Ưu tiên">Ưu tiên</option>
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
                      <strong>Đã xác nhận & lưu</strong> danh sách kỹ năng cùng ngữ cảnh CV/JD được mã hóa.
                    </span>
                    <Link to="/roadmap" className="t-strong">
                      Xem lộ trình học →
                    </Link>
                  </div>
                </Callout>
              )}

              <div className="row wrap">
                <Button
                  variant="accent"
                  onClick={handleConfirmSkills}
                  disabled={savingSkills || skills.length === 0}
                >
                  {savingSkills && <span className="spinner" aria-hidden="true" />}
                  Xác nhận & lưu
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
