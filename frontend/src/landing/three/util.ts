import type { EaseFn, Keyframe } from "../types";

export const clamp = (v: number, a = 0, b = 1): number =>
  Math.min(b, Math.max(a, v));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Vị trí của t trong [a,b], clamp về 0..1. */
export const range = (t: number, a: number, b: number): number =>
  clamp((t - a) / (b - a));

export const smooth = (t: number): number => t * t * (3 - 2 * t);

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeIn = (t: number): number => t * t * t;

/**
 * Track keyframe theo p. keys: [[p, value], ...] (value: số hoặc mảng số), sắp xếp tăng dần theo p.
 * Nội suy giữa hai key bằng hàm ease (mặc định smoothstep) → chuyển động mượt, dừng nhẹ ở mỗi key.
 */
export function track(
  keys: readonly Keyframe<number>[],
  ease?: EaseFn,
): (p: number) => number;
export function track(
  keys: readonly Keyframe<readonly [number]>[],
  ease?: EaseFn,
): (p: number) => [number];
export function track(
  keys: readonly Keyframe<readonly [number, number]>[],
  ease?: EaseFn,
): (p: number) => [number, number];
export function track(
  keys: readonly Keyframe<readonly [number, number, number]>[],
  ease?: EaseFn,
): (p: number) => [number, number, number];
export function track(
  keys: readonly Keyframe<readonly number[]>[],
  ease?: EaseFn,
): (p: number) => number[];
export function track(
  keys: readonly Keyframe<number | readonly number[]>[],
  ease: EaseFn = smooth,
): (p: number) => number | number[] {
  const first = keys[0];
  if (!first) {
    throw new RangeError("track() requires at least one keyframe");
  }
  const isArr = Array.isArray(first[1]);
  const out: number[] = isArr
    ? new Array<number>((first[1] as readonly number[]).length).fill(0)
    : [];

  return (p: number) => {
    let i = 0;
    while (i < keys.length - 2) {
      const next = keys[i + 1];
      if (!next || p <= next[0]) break;
      i++;
    }
    const k0 = keys[i] ?? first;
    const k1 = keys[Math.min(i + 1, keys.length - 1)] ?? k0;
    const [p0, v0] = k0;
    const [p1, v1] = k1;
    const t = p1 === p0 ? 0 : ease(clamp((p - p0) / (p1 - p0)));
    if (!isArr) {
      return lerp(v0 as number, v1 as number, t);
    }
    const a0 = v0 as readonly number[];
    const a1 = v1 as readonly number[];
    for (let k = 0; k < out.length; k++) {
      out[k] = lerp(a0[k] ?? 0, a1[k] ?? 0, t);
    }
    return out;
  };
}

/** Số giả ngẫu nhiên xác định theo seed (để bố cục ổn định giữa các lần tải). */
export function rng(seed = 1): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
