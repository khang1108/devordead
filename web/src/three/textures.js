import * as THREE from "three";
import { rng } from "./util.js";

// Màu do bảng màu hiện tại quyết định — xem three/palette.js (gọi setTexturePalette trước khi tạo texture)
const P = {
  paper: "#FFFFFF",
  paperInk: "#0B0B0C",
  paperInk2: "#5B5D63",
  paperLine: "#D9D9D5",
  paperSoft: "#E7E7E3",
  groundInk: "#0B0B0C",
  accent: "#22C55E",
};
export function setTexturePalette(css) {
  Object.assign(P, css);
}
const DISPLAY = '"Unbounded", system-ui, sans-serif';
const BODY = '"Be Vietnam Pro", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

function toTexture(c, renderer) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/** Các dòng xám giả lập đoạn văn. */
function textLines(g, x, y, w, rows, gap, r, minW = 0.45) {
  for (let i = 0; i < rows; i++) {
    const lw = w * (i === rows - 1 ? minW + r() * 0.2 : 0.75 + r() * 0.25);
    g.fillStyle = P.paperLine;
    g.fillRect(x, y + i * gap, lw, 10);
  }
}

// Tờ giấy dọc tỉ lệ A4 (1 : 1.414). Mặt trước: CV.
export function makeCVTexture(renderer) {
  const W = 1024, H = 1448;
  const [c, g] = canvas(W, H);
  const r = rng(7);
  g.fillStyle = P.paper;
  g.fillRect(0, 0, W, H);

  // ảnh đại diện + tên
  g.fillStyle = P.paperSoft;
  g.beginPath();
  g.arc(160, 170, 78, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = P.paperInk;
  g.font = `900 64px ${DISPLAY}`;
  g.fillText("NGUYỄN VĂN A", 280, 165);
  g.fillStyle = P.paperInk2;
  g.font = `500 30px ${BODY}`;
  g.fillText("Software Engineer · Fresh Graduate 2026", 282, 215);
  g.fillStyle = P.accent;
  g.fillRect(80, 290, W - 160, 6);

  const sections = ["HỌC VẤN", "KỸ NĂNG", "DỰ ÁN", "HOẠT ĐỘNG"];
  let y = 370;
  for (const s of sections) {
    g.fillStyle = P.paperInk;
    g.font = `700 30px ${DISPLAY}`;
    g.fillText(s, 80, y);
    textLines(g, 80, y + 36, W - 160, s === "DỰ ÁN" ? 6 : 4, 30, r);
    y += s === "DỰ ÁN" ? 300 : 230;
  }
  g.fillStyle = P.paperInk2;
  g.font = `400 22px ${MONO}`;
  g.fillText("curriculum_vitae.pdf", 80, H - 70);
  return toTexture(c, renderer);
}

// Thư mời nhận việc.
export function makeOfferTexture(renderer) {
  const W = 1024, H = 1448;
  const [c, g] = canvas(W, H);
  const r = rng(11);
  g.fillStyle = P.paper;
  g.fillRect(0, 0, W, H);

  g.fillStyle = P.paperInk;
  g.font = `900 34px ${DISPLAY}`;
  g.fillText("ACME TECH", 80, 120);
  g.fillStyle = P.paperInk2;
  g.font = `400 22px ${MONO}`;
  g.fillText("TP. Hồ Chí Minh · 22/11/2026", 80, 160);
  g.fillStyle = P.paperLine;
  g.fillRect(80, 200, W - 160, 2);

  g.fillStyle = P.paperInk;
  g.font = `900 76px ${DISPLAY}`;
  g.fillText("THƯ MỜI", 80, 330);
  g.fillText("NHẬN VIỆC", 80, 420);

  g.font = `700 34px ${BODY}`;
  g.fillText("Chúc mừng bạn!", 80, 520);
  g.fillStyle = P.paperInk2;
  g.font = `400 28px ${BODY}`;
  const para = [
    "Chúng tôi trân trọng mời bạn gia nhập đội ngũ",
    "ACME Tech với vị trí Backend Engineer.",
    "Ngày bắt đầu dự kiến: 05/01/2027.",
  ];
  para.forEach((l, i) => g.fillText(l, 80, 580 + i * 44));
  textLines(g, 80, 760, W - 160, 6, 32, r);

  // dấu OFFER màu nhấn
  g.save();
  g.translate(740, 1180);
  g.rotate(-0.16);
  g.strokeStyle = P.accent;
  g.lineWidth = 8;
  g.strokeRect(-150, -60, 300, 120);
  g.fillStyle = P.accent;
  g.font = `900 64px ${DISPLAY}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("OFFER", 0, 4);
  g.restore();

  // chữ ký
  g.strokeStyle = P.paperInk;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(90, 1200);
  g.bezierCurveTo(150, 1120, 190, 1260, 250, 1180);
  g.bezierCurveTo(290, 1130, 320, 1230, 380, 1170);
  g.stroke();
  g.fillStyle = P.paperInk2;
  g.font = `400 24px ${BODY}`;
  g.fillText("Trưởng phòng Nhân sự", 80, 1260);
  return toTexture(c, renderer);
}

/** Nhãn chữ nằm trên mặt đất (lộ trình). Trả về { texture, aspect }. */
export function makeLabelTexture(renderer, index, title, { dark = false } = {}) {
  const W = 1024, H = 256;
  const [c, g] = canvas(W, H);
  g.clearRect(0, 0, W, H);
  g.fillStyle = dark ? "#FFFFFF" : P.accent;
  g.font = `700 44px ${MONO}`;
  g.fillText(index, 8, 70);
  g.fillStyle = dark ? "#FFFFFF" : P.groundInk;
  g.font = `900 78px ${DISPLAY}`;
  g.fillText(title.toUpperCase(), 8, 175);
  return { texture: toTexture(c, renderer), aspect: W / H };
}

/** Sprite mây mềm, vẽ bằng nhiều vòng tròn gradient. */
export function makeCloudTexture(renderer, seed = 3) {
  const S = 512;
  const [c, g] = canvas(S, S);
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const x = S * (0.22 + r() * 0.56);
    const y = S * (0.38 + r() * 0.28);
    const rad = S * (0.1 + r() * 0.16);
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  return toTexture(c, renderer);
}
