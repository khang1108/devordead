import * as THREE from "three";

/**
 * Bảng màu cho thế giới 3D, đọc từ biến CSS (--bg, --ink, --accent…) để đổi bảng màu chỉ cần đổi CSS
 * (html[data-palette="…"] trong base.css). Các màu phụ (đường băng, tường code, quả cầu…) được suy ra từ đó,
 * kể cả cho bảng màu nền tối (khi --bg tối hơn --ink).
 */
export function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const hex = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  const col = (name, fallback) => new THREE.Color(hex(name, fallback));
  const mix = (a, b, t) => a.clone().lerp(b, t);
  const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

  const bg = col("--bg", "#F3F3F1");
  const bgDark = col("--bg-dark", "#0A0B0D");
  const ink = col("--ink", "#0B0B0C");
  const accent = col("--accent", "#22C55E");
  // --brand: màu thương hiệu cho tiến độ/khối lớn; bảng màu không khai báo riêng thì brand = accent
  const brand = col("--brand", hex("--accent", "#22C55E"));
  const hasBrand = !brand.equals(accent);
  const onDark = col("--on-dark", "#F3F3F1");
  const surface = col("--surface", "#FFFFFF");
  const sky = col("--sky", "#D6E5F1");
  const paper = col("--paper", "#FFFFFF");
  const black = new THREE.Color(0x000000);
  const darkTheme = lum(bg) < lum(ink); // nền tối, chữ sáng

  // chữ in trên giấy (CV, thư mời) luôn là màu tối nhất của bảng màu
  const paperInk = darkTheme ? bg : ink;
  const paperInkHex = darkTheme ? hex("--bg", "#0E1116") : hex("--ink", "#0B0B0C");

  return {
    darkTheme,
    bg,
    bgDark,
    ink,
    accent,
    brand,
    onDark,
    surface,
    sky,
    skyHigh: mix(sky, bg, 0.55),
    paper,
    runway: hasBrand ? brand.clone() : darkTheme ? mix(bgDark, black, 0.2) : mix(ink, black, 0.15),
    runwayLine: onDark,
    wallToken: mix(bg, ink, 0.2),
    wallDim: mix(bg, ink, 0.1),
    wallLit: mix(bg, brand, 0.6),
    orbBase: mix(bgDark, black, 0.4),
    orbDust: mix(bgDark, onDark, 0.6),
    hemiSky: darkTheme ? mix(onDark, bg, 0.3) : mix(new THREE.Color(0xffffff), bg, 0.3),
    hemiGround: mix(bg, ink, 0.12),
    shadow: darkTheme ? black : ink,
    shadowOpacity: darkTheme ? 0.35 : 0.13,
    confetti: [accent, new THREE.Color(0xffc24b), paperInk, new THREE.Color(0x6c8cff), new THREE.Color(0xff9ec4), new THREE.Color(0x2fbf71), new THREE.Color(0xe23b2e)],
    // cho texture canvas (chuỗi màu CSS)
    css: {
      paper: hex("--paper", "#FFFFFF"),
      paperInk: paperInkHex,
      paperInk2: "#" + mix(paperInk, paper, 0.38).getHexString(THREE.SRGBColorSpace),
      paperLine: "#" + mix(paper, paperInk, 0.13).getHexString(THREE.SRGBColorSpace),
      paperSoft: "#" + mix(paper, paperInk, 0.08).getHexString(THREE.SRGBColorSpace),
      groundInk: hex("--ink", "#0B0B0C"),
      accent: hex("--accent", "#22C55E"),
    },
  };
}
