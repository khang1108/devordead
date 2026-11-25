import * as THREE from "three";

/**
 * Bảng màu Studio trung tính cho thế giới 3D (Round 2 Anti-Slop Design System).
 * Đọc trực tiếp từ biến CSS (html[data-palette="…"]) với mặc định giấy gallery ấm #FBFBF9,
 * mực đen sắc nét #111418, độ bóng đổ tiếp xúc dịu nhẹ (0.075), tuyệt đối 0% tím / neon.
 */
export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const hex = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  const col = (name, fallback) => {
    const raw = hex(name, fallback);
    // Nếu biến CSS dùng rgba(...), lấy fallback hex an toàn cho THREE.Color
    if (raw.startsWith("rgba")) return new THREE.Color(fallback);
    return new THREE.Color(raw);
  };
  const mix = (a, b, t) => a.clone().lerp(b, t);
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

  const bg = col("--bg", "#FBFBF9");
  const bgDark = col("--bg-dark", "#111418");
  const ink = col("--ink", "#111418");
  const ink2 = col("--ink-2", "#525866");
  const ink3 = col("--ink-3", "#8A909E");
  const accent = col("--accent", "#E03E32");
  const brand = col("--brand", "#2484B5");
  const onDark = col("--on-dark", "#F6F7F8");
  const surface = col("--surface", "#FFFFFF");
  const sky = col("--sky", "#E6EFF5");
  const paper = col("--paper", "#FFFFFF");

  const black = new THREE.Color(0x000000);
  const white = new THREE.Color(0xffffff);
  const emerald = new THREE.Color(0x16794c);
  const pearl = new THREE.Color(0xf0f4f8);
  const ceramic = new THREE.Color(0xeaedf1);
  const slateMuted = new THREE.Color(0xd5d9e0);
  const capObsidian = new THREE.Color(0x181b20);
  const capCord = new THREE.Color(0xb58952);
  const warmGold = new THREE.Color(0xc98a3b);

  const darkTheme = lum(bg) < lum(ink);

  // Mực in trên tài liệu giấy A4 (CV & Offer Letter) luôn là sắc đen biên tập #111418
  const paperInk = darkTheme ? new THREE.Color(0x111418) : ink;
  const paperInkHex = "#" + paperInk.getHexString(THREE.SRGBColorSpace);
  const brandHex = "#" + brand.getHexString(THREE.SRGBColorSpace);
  const accentHex = "#" + accent.getHexString(THREE.SRGBColorSpace);

  return {
    darkTheme,
    bg,
    bgDark,
    ink,
    ink2,
    ink3,
    accent,
    brand,
    onDark,
    surface,
    sky: mix(sky, bg, 0.35),
    skyHigh: mix(sky, bg, 0.65),
    paper,
    emerald,
    pearl,
    ceramic,
    capObsidian: darkTheme ? mix(capObsidian, surface, 0.08) : capObsidian,
    capCord,
    // Đường băng & bản vẽ kiến trúc ATC tiết chế
    runway: darkTheme ? mix(bgDark, black, 0.25) : new THREE.Color(0x181b20),
    runwayShoulder: darkTheme ? mix(bgDark, surface, 0.06) : new THREE.Color(0x23272f),
    runwayLine: new THREE.Color(0xf4f4f0),
    draftGraphite: darkTheme ? mix(ink2, onDark, 0.25) : ink3.clone(),
    draftActive: darkTheme ? brand.clone() : mix(ink, brand, 0.38),
    // Tấm gốm mờ (matte ceramic) & thanh token cho cảnh Code
    ceramicPlate: darkTheme ? mix(bgDark, surface, 0.12) : white.clone(),
    ceramicBack: darkTheme ? mix(bgDark, surface, 0.06) : ceramic.clone(),
    ceramicEdge: darkTheme ? mix(bgDark, surface, 0.2) : slateMuted.clone(),
    wallToken: darkTheme ? mix(bgDark, onDark, 0.24) : new THREE.Color(0xd8dde5),
    wallDim: darkTheme ? mix(bgDark, onDark, 0.14) : new THREE.Color(0xe6e9ef),
    wallLit: emerald.clone(),
    // Quả cầu ngọc trai mờ (Calm Matte-Pearl AI Sphere) trên nền tối #111418
    orbBase: mix(bgDark, new THREE.Color(0x0c0e12), 0.5),
    orbPearl: pearl.clone(),
    orbSky: brand.clone(),
    orbEmerald: emerald.clone(),
    orbRing: new THREE.Color(0x94a3b8),
    // Ánh sáng Studio êm dịu
    hemiSky: darkTheme ? mix(onDark, bg, 0.35) : white.clone(),
    hemiGround: mix(bg, ink, 0.06),
    rimDay: white.clone(),
    rimNight: mix(pearl, brand, 0.22),
    shadow: darkTheme ? black : ink,
    shadowOpacity: darkTheme ? 0.24 : 0.075,
    // Pháo giấy biên tập tinh tế (không neon, không tím/lavender)
    confetti: [
      paperInk.clone(),
      brand.clone(),
      emerald.clone(),
      warmGold.clone(),
      accent.clone(),
      slateMuted.clone(),
    ],
    // Chuỗi màu CSS cho tài liệu in biên tập Thụy Sĩ (Swiss Editorial A4)
    css: {
      paper: "#FFFFFF",
      paperInk: paperInkHex,
      paperInk2: "#525866",
      paperInk3: "#8A909E",
      paperLine: "#E4E6EA",
      paperRuleStrong: "#111418",
      paperSoft: "#F6F7F8",
      groundInk: "#" + ink.getHexString(THREE.SRGBColorSpace),
      groundMuted: "#" + ink2.getHexString(THREE.SRGBColorSpace),
      accent: accentHex,
      brand: brandHex,
      emerald: "#16794C",
    },
  };
}
