import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHead,
  Chip,
  Field,
  PageHeader,
  RuleTag,
  Segmented,
} from "../components/ui.jsx";
import { LEVELS, ROLE_FAMILIES } from "../data/mock.js";
import "./ProfileScreen.css";

const MAX_CV_BYTES = 5 * 1024 * 1024;

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

  // Cột trái: Vị trí & cấp độ
  const [role, setRole] = useState("Backend");
  const [level, setLevel] = useState("Fresher");
  const [savingTarget, setSavingTarget] = useState(false);
  const [targetSaved, setTargetSaved] = useState(false);

  // Cột phải: CV & JD
  const [cvFile, setCvFile] = useState(null);
  const [cvError, setCvError] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdError, setJdError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [skills, setSkills] = useState(null); // null trước khi phân tích
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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!isValidCvFile(file)) {
      setCvFile(null);
      setCvError("Tệp không hợp lệ. Chỉ chấp nhận .pdf hoặc .docx, dung lượng ≤ 5MB.");
      return;
    }

    setCvError("");
    setJdError("");
    setCvFile(file);
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
    }, 1000);
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

  return (
    <div className="col stack-lg">
      <PageHeader
        eyebrow="08 — HỒ SƠ MỤC TIÊU"
        title="Bạn đang nhắm tới đâu?"
        subtitle="Thiết lập vị trí, cấp độ và phân tích CV/JD để hệ thống cá nhân hóa lộ trình luyện tập."
      />

      <div className="prof-grid">
        {/* Cột trái: Vị trí & cấp độ */}
        <Card>
          <CardHead title="Vị trí & cấp độ" />

          {ROLE_FAMILIES.map((group) => (
            <div key={group.family} className="prof-group">
              <p className="t-body-s prof-group__label">{group.family}</p>
              <div className="row wrap">
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
            <p className="t-body-s prof-group__label">Cấp độ mục tiêu</p>
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

          <Callout tone="brand">
            Lộ trình sẽ được khởi tạo cho <strong>{role} · {level}</strong>, ưu tiên các chủ đề phỏng vấn sát với cấp độ bạn chọn.
          </Callout>

          {targetSaved && (
            <Callout tone="success">
              Đã lưu. Lộ trình đã được cập nhật.
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

        {/* Cột phải: CV & JD */}
        <Card>
          <CardHead title="CV & JD">
            <RuleTag code="NFR04">Mã hóa khi lưu</RuleTag>
          </CardHead>

          <div className="prof-group">
            <label className="field__label" htmlFor="prof-cv-input">
              Tệp CV (.pdf hoặc .docx, tối đa 5MB)
            </label>
            <div className="prof-file-box">
              <input
                ref={fileInputRef}
                id="prof-cv-input"
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={handleFileChange}
              />
              <div className="row between wrap">
                <span className="t-body-s c-ink2">
                  {cvFile ? "Đã chọn 1 tệp CV" : "Chưa có tệp nào được chọn"}
                </span>
                <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {cvFile ? "Đổi tệp CV" : "Chọn tệp CV"}
                </Button>
              </div>

              {cvFile && (
                <div className="prof-file-info">
                  <div className="prof-file-meta">
                    <span className="prof-file-name">{cvFile.name}</span>
                    <Badge tone="neutral">{formatFileSize(cvFile.size)}</Badge>
                  </div>
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
              )}

              {cvError && (
                <p className="field__error" role="alert">
                  {cvError}
                </p>
              )}
            </div>
          </div>

          <Field
            multiline
            label="Nội dung JD (Mô tả công việc)"
            placeholder="Dán nội dung JD tại đây để AI đối chiếu kỹ năng còn thiếu so với CV..."
            value={jdText}
            onChange={(e) => {
              setJdText(e.target.value);
              if (jdError) setJdError("");
            }}
            error={jdError}
          />

          <div className="row wrap">
            <Button variant="primary" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing && <span className="spinner" aria-hidden="true" />}
              Phân tích CV/JD
            </Button>
          </div>

          {skills !== null && (
            <div className="col">
              <hr className="divider" />
              <div className="row between wrap">
                <p className="t-mono c-ink2">KỸ NĂNG TRÍCH XUẤT ({skills.length})</p>
              </div>

              {skills.length === 0 ? (
                <p className="t-body-s c-ink2">Chưa có kỹ năng nào. Hãy thêm thủ công ở dưới hoặc phân tích lại.</p>
              ) : (
                <ul className="prof-skills-list">
                  {skills.map((skill) => (
                    <li key={skill.id} className="prof-skill-row">
                      <div className="prof-skill-main">
                        <span className="prof-skill-name">{skill.name}</span>
                        <Badge tone={skill.matched ? "success" : "warning"}>
                          {skill.matched ? "KHỚP CV" : "THIẾU TRONG CV"}
                        </Badge>
                      </div>
                      <div className="prof-skill-actions">
                        <Badge tone="neutral">{skill.level}</Badge>
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
                <Callout tone="success">
                  Đã xác nhận & lưu danh sách kỹ năng cùng hồ sơ CV/JD.
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
