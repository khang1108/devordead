// Khoảng tiến độ toàn cục p ∈ [0,1] của từng cảnh — khớp docs/landing-spec.md
export const SCENES = [
  { key: "hero", start: 0.0, end: 0.074 },
  { key: "fold", start: 0.074, end: 0.185 },
  { key: "roadmap", start: 0.185, end: 0.333 },
  { key: "code", start: 0.333, end: 0.481 },
  { key: "ai", start: 0.481, end: 0.667 },
  { key: "hr", start: 0.667, end: 0.778 },
  { key: "clouds", start: 0.778, end: 0.889 },
  { key: "offer", start: 0.889, end: 1.0 },
];

export const SCENE = Object.fromEntries(SCENES.map((s) => [s.key, s]));

/** Tiến độ cục bộ (0..1, đã clamp) của cảnh `key` tại tiến độ toàn cục p. */
export function localT(p, key) {
  const s = SCENE[key];
  return Math.min(1, Math.max(0, (p - s.start) / (s.end - s.start)));
}
