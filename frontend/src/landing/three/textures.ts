import * as THREE from "three";
import { rng } from "./util";
import type {
  LabelTextureOptions,
  LabelTextureResult,
  TexturePaletteCSS,
} from "../types";

// Bảng màu tài liệu in biên tập Thụy Sĩ (Swiss Editorial Print — Round 2 Anti-Slop)
const P: TexturePaletteCSS = {
  paper: "#FFFFFF",
  paperInk: "#111418",
  paperInk2: "#525866",
  paperInk3: "#8A909E",
  paperLine: "#E4E6EA",
  paperRuleStrong: "#111418",
  paperSoft: "#F6F7F8",
  groundInk: "#111418",
  groundMuted: "#525866",
  accent: "#E03E32",
  brand: "#2484B5",
  emerald: "#16794C",
};

export function setTexturePalette(css: Partial<TexturePaletteCSS>): void {
  Object.assign(P, css);
}

const DISPLAY = '"Plus Jakarta Sans", "Be Vietnam Pro", system-ui, sans-serif';
const BODY = '"Be Vietnam Pro", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

function canvas(
  w: number,
  h: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D canvas context");
  }
  return [c, ctx];
}

function toTexture(
  c: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  g.beginPath();
  if (typeof g.roundRect === "function") {
    g.roundRect(x, y, w, h, r);
  } else {
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
}

function fitText(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth?: number,
): void {
  if (maxWidth) g.fillText(text, x, y, maxWidth);
  else g.fillText(text, x, y);
}

function drawMonochromeChips(
  g: CanvasRenderingContext2D,
  items: readonly string[],
  x: number,
  y: number,
): void {
  let cx = x;
  g.font = `400 22px ${MONO}`;
  for (const label of items) {
    const tw = g.measureText(label).width;
    const pw = tw + 30;
    const ph = 44;
    roundRect(g, cx, y, pw, ph, 6);
    g.fillStyle = P.paper;
    g.fill();
    g.lineWidth = 1.25;
    g.strokeStyle = P.paperLine;
    g.stroke();

    g.fillStyle = P.paperInk;
    g.fillText(label, cx + 15, y + 29);
    cx += pw + 12;
  }
}

/**
 * Tờ CV chuẩn Swiss Editorial Print (1600 × 2262 — High-DPI).
 * Sentence-case Plus Jakarta Sans + Be Vietnam Pro, lưới 2 cột bất đối xứng,
 * đường kẻ mảnh 1px, thẻ kỹ năng đơn sắc tối giản, 0 dải màu lòe loẹt, 0 hộp lồng hộp.
 */
export function makeCVTexture(
  renderer: THREE.WebGLRenderer,
): THREE.CanvasTexture {
  const W = 1600;
  const H = 2262;
  const M = 124;
  const CW = W - M * 2;
  const COL_X = M + 300;
  const COL_W = W - M - COL_X;
  const [c, g] = canvas(W, H);

  // Mặt giấy trắng tinh khiết
  g.fillStyle = P.paper;
  g.fillRect(0, 0, W, H);

  // ——— Header biên tập tối giản ———
  g.fillStyle = P.paperInk;
  g.font = `600 72px ${DISPLAY}`;
  fitText(g, "Nguyễn Minh Anh", M, 182, 860);

  g.fillStyle = P.paperInk2;
  g.font = `400 31px ${BODY}`;
  fitText(g, "Backend Engineer · Fresher 2026", M, 238, 860);

  g.save();
  g.textAlign = "right";
  g.fillStyle = P.paperInk2;
  g.font = `400 21px ${MONO}`;
  g.fillText("minhanh.dev@student.example", W - M, 148);
  g.fillText("github.com/minhanh-be", W - M, 186);
  g.font = `400 23px ${BODY}`;
  g.fillText("TP. Thủ Đức, TP. Hồ Chí Minh", W - M, 226);
  g.restore();

  // Đường kẻ mảnh phân tách phần đầu
  g.fillStyle = P.paperRuleStrong;
  g.fillRect(M, 296, CW, 2);

  // ——— 1. Học vấn ———
  g.fillStyle = P.paperInk2;
  g.font = `500 26px ${BODY}`;
  g.fillText("Học vấn", M, 378);

  g.fillStyle = P.paperInk;
  g.font = `600 30px ${DISPLAY}`;
  fitText(
    g,
    "Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM",
    COL_X,
    378,
    COL_W - 190,
  );

  g.save();
  g.textAlign = "right";
  g.fillStyle = P.paperInk2;
  g.font = `400 22px ${MONO}`;
  g.fillText("2022 – 2026", W - M, 378);
  g.restore();

  g.fillStyle = P.paperInk2;
  g.font = `400 26px ${BODY}`;
  fitText(
    g,
    "Cử nhân Kỹ thuật Phần mềm  ·  GPA 3.68 / 4.00  ·  Học bổng Khuyến khích Học tập",
    COL_X,
    426,
    COL_W,
  );

  g.fillStyle = P.paperLine;
  g.fillRect(M, 492, CW, 1.5);

  // ——— 2. Kỹ năng kỹ thuật ———
  g.fillStyle = P.paperInk2;
  g.font = `500 26px ${BODY}`;
  g.fillText("Kỹ năng kỹ thuật", M, 568);

  drawMonochromeChips(
    g,
    ["Python 3.11", "Go", "TypeScript", "PostgreSQL", "Redis", "FastAPI"],
    COL_X,
    534,
  );
  drawMonochromeChips(
    g,
    ["Docker", "Cấu trúc dữ liệu", "System Design", "WebSocket", "Linux cgroups"],
    COL_X,
    594,
  );

  g.fillStyle = P.paperInk2;
  g.font = `400 25px ${BODY}`;
  fitText(
    g,
    "Thiết kế API độ trễ thấp, tối ưu chỉ mục cơ sở dữ liệu, xử lý đồng thời và cô lập môi trường thực thi.",
    COL_X,
    688,
    COL_W,
  );

  g.fillStyle = P.paperLine;
  g.fillRect(M, 748, CW, 1.5);

  // ——— 3. Dự án kỹ thuật ———
  g.fillStyle = P.paperInk2;
  g.font = `500 26px ${BODY}`;
  g.fillText("Dự án kỹ thuật", M, 828);

  // Dự án 1 (trình bày phẳng trên mặt giấy, không hộp xám lồng bên trong)
  g.fillStyle = P.paperInk;
  g.font = `600 30px ${DISPLAY}`;
  fitText(
    g,
    "DevOrDead — Nền tảng mô phỏng phỏng vấn IT với AI",
    COL_X,
    828,
    COL_W - 290,
  );

  g.save();
  g.textAlign = "right";
  g.fillStyle = P.paperInk3;
  g.font = `400 21px ${MONO}`;
  g.fillText("FastAPI · Docker · Redis", W - M, 826);
  g.restore();

  g.fillStyle = P.paperInk2;
  g.font = `400 25px ${BODY}`;
  const proj1 = [
    "— Thiết kế Code Sandbox cô lập bằng Docker cgroups v2 (1 vCPU, 256 MB RAM, network=none).",
    "— Xây dựng WebSocket Gateway xử lý giọng nói hai chiều với độ trễ phản hồi ≤ 2,1 giây.",
    "— Tách biệt chấm điểm độ đúng mã nguồn và khả năng lập luận thuật toán độc lập (BR2).",
  ];
  proj1.forEach((line, i) => fitText(g, line, COL_X, 882 + i * 50, COL_W));

  // Đường kẻ phụ mảnh giữa 2 dự án
  g.fillStyle = P.paperLine;
  g.fillRect(COL_X, 1068, COL_W, 1.2);

  // Dự án 2
  g.fillStyle = P.paperInk;
  g.font = `600 30px ${DISPLAY}`;
  fitText(
    g,
    "OrderFlow — Dịch vụ điều phối tồn kho tải cao",
    COL_X,
    1134,
    COL_W - 280,
  );

  g.save();
  g.textAlign = "right";
  g.fillStyle = P.paperInk3;
  g.font = `400 21px ${MONO}`;
  g.fillText("Go · PostgreSQL · Lua", W - M, 1132);
  g.restore();

  g.fillStyle = P.paperInk2;
  g.font = `400 25px ${BODY}`;
  const proj2 = [
    "— Triển khai khóa nguyên tử Redis Lua và khóa idempotent xử lý ổn định 3.200 yêu cầu/giây.",
    "— Tối ưu chỉ mục B-Tree kết hợp connection pool, giảm độ trễ p99 từ 142 ms xuống 16 ms.",
  ];
  proj2.forEach((line, i) => fitText(g, line, COL_X, 1188 + i * 50, COL_W));

  g.fillStyle = P.paperLine;
  g.fillRect(M, 1336, CW, 1.5);

  // ——— 4. Thành tích & hoạt động ———
  g.fillStyle = P.paperInk2;
  g.font = `500 26px ${BODY}`;
  g.fillText("Thành tích", M, 1416);

  const metrics: ReadonlyArray<{ readonly val: string; readonly label: string }> =
    [
      { val: "420+", label: "Bài thuật toán đạt chuẩn" },
      { val: "Giải Nhì", label: "Hackathon CNPM 2025" },
      { val: "IELTS 7.0", label: "Giao tiếp kỹ thuật" },
    ];
  const mColW = Math.floor(COL_W / 3);
  metrics.forEach((m, idx) => {
    const mx = COL_X + idx * mColW;
    if (idx > 0) {
      g.fillStyle = P.paperLine;
      g.fillRect(mx - 24, 1384, 1.2, 116);
    }
    g.fillStyle = P.paperInk;
    g.font = `600 42px ${DISPLAY}`;
    fitText(g, m.val, mx, 1430, mColW - 36);

    g.fillStyle = P.paperInk2;
    g.font = `400 23px ${BODY}`;
    fitText(g, m.label, mx, 1476, mColW - 36);
  });

  g.fillStyle = P.paperInk2;
  g.font = `400 25px ${BODY}`;
  fitText(
    g,
    "— Trưởng nhóm Backend CLB Lập trình Sinh viên · Hướng dẫn chuyên đề Cấu trúc dữ liệu cho 60+ sinh viên.",
    COL_X,
    1568,
    COL_W,
  );

  g.fillStyle = P.paperLine;
  g.fillRect(M, 1638, CW, 1.5);

  // ——— 5. Định hướng nghề nghiệp ———
  g.fillStyle = P.paperInk2;
  g.font = `500 26px ${BODY}`;
  g.fillText("Định hướng", M, 1716);

  g.fillStyle = P.paperInk;
  g.font = `400 27px ${BODY}`;
  fitText(
    g,
    "Theo đuổi kỹ thuật hệ thống Backend có độ tin cậy cao, kiểm thử rõ ràng và vận hành bền vững",
    COL_X,
    1716,
    COL_W,
  );
  fitText(
    g,
    "ở quy mô sản phẩm thực tế. Sẵn sàng làm việc toàn thời gian ngay sau khi tốt nghiệp.",
    COL_X,
    1764,
    COL_W,
  );

  // ——— Footer mảnh ———
  g.fillStyle = P.paperLine;
  g.fillRect(M, 2108, CW, 1.5);

  g.fillStyle = P.paperInk3;
  g.font = `400 21px ${MONO}`;
  g.fillText("NguyenMinhAnh_CV_2026.pdf", M, 2154);

  g.save();
  g.textAlign = "right";
  g.fillText("Trang 1 / 1", W - M, 2154);
  g.restore();

  return toTexture(c, renderer);
}

/**
 * Thư mời nhận việc chính thức chuẩn Swiss Editorial Print (1600 × 2262 — High-DPI).
 * Sentence-case sang trọng, bảng điều khoản kẻ chỉ 1px phẳng, chữ ký bút máy và mộc tròn mảnh tinh tế.
 */
export function makeOfferTexture(
  renderer: THREE.WebGLRenderer,
): THREE.CanvasTexture {
  const W = 1600;
  const H = 2262;
  const M = 128;
  const CW = W - M * 2;
  const [c, g] = canvas(W, H);

  g.fillStyle = P.paper;
  g.fillRect(0, 0, W, H);

  // ——— Letterhead tối giản ———
  g.save();
  g.translate(M + 22, 148);
  roundRect(g, -22, -22, 44, 44, 10);
  g.fillStyle = P.paperInk;
  g.fill();
  g.fillStyle = P.accent;
  g.fillRect(-10, -11, 5, 22);
  g.fillRect(-2, -11, 5, 22);
  g.strokeStyle = P.paper;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(6, 0, 8.5, -Math.PI / 2, Math.PI / 2);
  g.stroke();
  g.restore();

  g.fillStyle = P.paperInk;
  g.font = `600 34px ${DISPLAY}`;
  fitText(g, "Nexus Cloud Vietnam", M + 62, 146, 720);

  g.fillStyle = P.paperInk2;
  g.font = `400 22px ${BODY}`;
  fitText(
    g,
    "Khối Kỹ thuật Phần mềm  ·  Khu Công nghệ cao, TP. Hồ Chí Minh",
    M + 62,
    184,
    780,
  );

  g.save();
  g.textAlign = "right";
  g.fillStyle = P.paperInk2;
  g.font = `400 21px ${MONO}`;
  g.fillText("Mã thư: NXC-2026/0842", W - M, 144);
  g.font = `400 22px ${BODY}`;
  g.fillText("Ngày 25 tháng 11 năm 2026", W - M, 184);
  g.restore();

  g.fillStyle = P.paperLine;
  g.fillRect(M, 244, CW, 1.5);

  // ——— Tiêu đề Sentence-Case lớn ———
  g.fillStyle = P.paperInk2;
  g.font = `500 24px ${BODY}`;
  g.fillText("Đề nghị tuyển dụng chính thức", M, 334);

  g.fillStyle = P.paperInk;
  g.font = `600 88px ${DISPLAY}`;
  fitText(g, "Thư mời nhận việc.", M, 442, CW);

  // ——— Lời chào & đoạn dẫn ———
  g.fillStyle = P.paperInk;
  g.font = `600 32px ${BODY}`;
  fitText(g, "Thân gửi Nguyễn Minh Anh,", M, 558, CW);

  g.fillStyle = P.paperInk2;
  g.font = `400 27px ${BODY}`;
  const intro = [
    "Cảm ơn bạn đã tham gia các vòng phỏng vấn Kỹ thuật, Live Coding và Văn hóa tại Nexus Cloud.",
    "Hội đồng Kỹ thuật đánh giá rất cao tư duy thuật toán, sự điềm tĩnh và cách lập luận rõ ràng của bạn.",
    "Chúng tôi trân trọng mời bạn gia nhập đội ngũ với các điều khoản chính thức như sau:",
  ];
  intro.forEach((line, i) => fitText(g, line, M, 616 + i * 44, CW));

  // ——— Bảng điều khoản kẻ chỉ 1px phẳng (Flat Hairline Ledger) ———
  const tableTop = 814;
  const rowH = 98;
  const rows: ReadonlyArray<readonly [string, string]> = [
    ["Vị trí chính thức", "Backend Engineer (Fresher — L3)"],
    ["Đơn vị chuyên môn", "Core Platform & Distributed Services"],
    ["Thu nhập hàng tháng", "22.500.000 VNĐ / tháng (Gross)"],
    ["Chế độ & phúc lợi", "Lương tháng 13 · Bảo hiểm sức khỏe · MacBook Pro"],
    ["Ngày bắt đầu dự kiến", "05 / 01 / 2027  ·  Toàn thời gian tại TP.HCM"],
  ];

  g.fillStyle = P.paperRuleStrong;
  g.fillRect(M, tableTop, CW, 2);

  rows.forEach(([key, val], i) => {
    const ry = tableTop + i * rowH;
    if (i > 0) {
      g.fillStyle = P.paperLine;
      g.fillRect(M, ry, CW, 1.4);
    }
    g.fillStyle = P.paperInk2;
    g.font = `500 25px ${BODY}`;
    fitText(g, key, M, ry + 60, 400);

    g.fillStyle = P.paperInk;
    g.font = i === 2 ? `600 28px ${MONO}` : `600 28px ${DISPLAY}`;
    fitText(g, val, M + 440, ry + 60, CW - 448);
  });

  const tableBottom = tableTop + rows.length * rowH;
  g.fillStyle = P.paperRuleStrong;
  g.fillRect(M, tableBottom, CW, 2);

  g.fillStyle = P.paperInk2;
  g.font = `400 25px ${BODY}`;
  fitText(
    g,
    "Thư mời có hiệu lực đến ngày 05/12/2026. Rất mong được chào đón bạn trong ngày làm việc đầu tiên.",
    M,
    tableBottom + 68,
    CW,
  );

  // ——— Chữ ký tay & Mộc tròn thanh mảnh ———
  const sigY = 1660;

  g.fillStyle = P.paperInk2;
  g.font = `500 23px ${BODY}`;
  g.fillText("Đại diện Nexus Cloud Vietnam", M, sigY);

  g.save();
  g.strokeStyle = P.paperInk;
  g.lineWidth = 3.6;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(M + 8, sigY + 128);
  g.bezierCurveTo(
    M + 62,
    sigY + 38,
    M + 116,
    sigY + 158,
    M + 182,
    sigY + 84,
  );
  g.bezierCurveTo(
    M + 226,
    sigY + 42,
    M + 252,
    sigY + 142,
    M + 316,
    sigY + 78,
  );
  g.bezierCurveTo(
    M + 358,
    sigY + 48,
    M + 402,
    sigY + 114,
    M + 458,
    sigY + 92,
  );
  g.stroke();
  g.restore();

  g.fillStyle = P.paperLine;
  g.fillRect(M, sigY + 174, 480, 1.5);

  g.fillStyle = P.paperInk;
  g.font = `600 29px ${DISPLAY}`;
  g.fillText("Lê Hoàng Nam", M, sigY + 218);
  g.fillStyle = P.paperInk2;
  g.font = `400 24px ${BODY}`;
  g.fillText("VP of Engineering", M, sigY + 254);

  // Mộc xác nhận tròn thanh mảnh kiểu con dấu văn phòng Thụy Sĩ / Nhật Bản
  g.save();
  g.translate(W - M - 165, sigY + 128);
  g.rotate(-0.14);
  g.globalAlpha = 0.72;
  g.strokeStyle = P.accent;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(0, 0, 108, 0, Math.PI * 2);
  g.stroke();

  g.lineWidth = 1.4;
  g.beginPath();
  g.arc(0, 0, 96, 0, Math.PI * 2);
  g.stroke();

  g.fillStyle = P.accent;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `500 18px ${MONO}`;
  g.fillText("NEXUS CLOUD", 0, -52);
  g.font = `600 30px ${DISPLAY}`;
  g.fillText("Accepted", 0, 2);
  g.font = `400 18px ${MONO}`;
  g.fillText("25 · 11 · 2026", 0, 50);
  g.restore();

  // Cột xác nhận ứng viên
  g.save();
  g.textAlign = "right";
  g.fillStyle = P.paperInk2;
  g.font = `400 23px ${BODY}`;
  g.fillText("Ứng viên: Nguyễn Minh Anh", W - M, sigY + 254);
  g.restore();

  // Footer
  g.fillStyle = P.paperLine;
  g.fillRect(M, 2108, CW, 1.5);

  g.fillStyle = P.paperInk3;
  g.font = `400 21px ${MONO}`;
  g.fillText("OfferLetter_NguyenMinhAnh_2026.pdf", M, 2154);

  g.save();
  g.textAlign = "right";
  g.fillText("Trang 1 / 1", W - M, 2154);
  g.restore();

  return toTexture(c, renderer);
}

/**
 * Nhãn trạm bản vẽ kiến trúc (ATC Drafting Label) trên mặt giấy — Sentence-case tinh gọn,
 * không dùng chữ in hoa dàn rộng hay huy hiệu màu sặc sỡ.
 */
export function makeLabelTexture(
  renderer: THREE.WebGLRenderer,
  index: string | number,
  title: string,
  { dark = false }: LabelTextureOptions = {},
): LabelTextureResult {
  const W = 1024;
  const H = 256;
  const [c, g] = canvas(W, H);
  g.clearRect(0, 0, W, H);

  g.fillStyle = dark ? "rgba(246,247,248,0.62)" : P.groundMuted;
  g.font = `500 36px ${MONO}`;
  g.fillText(String(index), 12, 68);

  g.fillStyle = dark ? "#F6F7F8" : P.groundInk;
  g.font = `600 76px ${DISPLAY}`;
  fitText(g, title, 12, 168, W - 24);

  g.fillStyle = dark ? "rgba(246,247,248,0.28)" : P.paperLine;
  g.fillRect(12, 198, 260, 3);

  return { texture: toTexture(c, renderer), aspect: W / H };
}

/** Sprite mây mềm sáng ấm dịu tự nhiên. */
export function makeCloudTexture(
  renderer: THREE.WebGLRenderer,
  seed = 3,
): THREE.CanvasTexture {
  const S = 512;
  const [c, g] = canvas(S, S);
  const r = rng(seed);

  for (let i = 0; i < 14; i++) {
    const x = S * (0.24 + r() * 0.52);
    const y = S * (0.48 + r() * 0.18);
    const rad = S * (0.12 + r() * 0.15);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, "rgba(214, 224, 234, 0.34)");
    grad.addColorStop(1, "rgba(214, 224, 234, 0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }

  for (let i = 0; i < 26; i++) {
    const x = S * (0.2 + r() * 0.6);
    const y = S * (0.32 + r() * 0.25);
    const rad = S * (0.09 + r() * 0.16);
    const grad = g.createRadialGradient(x, y - rad * 0.15, 0, x, y, rad);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.68)");
    grad.addColorStop(0.55, "rgba(252, 253, 255, 0.32)");
    grad.addColorStop(1, "rgba(255, 255, 255, 0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }

  return toTexture(c, renderer);
}
