export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Vị trí của t trong [a,b], clamp về 0..1. */
export const range = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t) => t * t * t;

/**
 * Track keyframe theo p. keys: [[p, value], ...] (value: số hoặc mảng số), sắp xếp tăng dần theo p.
 * Nội suy giữa hai key bằng hàm ease (mặc định smoothstep) → chuyển động mượt, dừng nhẹ ở mỗi key.
 */
export function track(keys, ease = smooth) {
  const isArr = Array.isArray(keys[0][1]);
  const out = isArr ? new Array(keys[0][1].length).fill(0) : 0;
  return (p) => {
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1][0]) i++;
    const [p0, v0] = keys[i];
    const [p1, v1] = keys[Math.min(i + 1, keys.length - 1)];
    const t = p1 === p0 ? 0 : ease(clamp((p - p0) / (p1 - p0)));
    if (!isArr) return lerp(v0, v1, t);
    for (let k = 0; k < out.length; k++) out[k] = lerp(v0[k], v1[k], t);
    return out;
  };
}

/** Số giả ngẫu nhiên xác định theo seed (để bố cục ổn định giữa các lần tải). */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
