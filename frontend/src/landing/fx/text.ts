import type { RevealController, RevealOptions } from "../types";

const segmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });
const splitCache = new WeakMap<HTMLElement, HTMLSpanElement[]>();
const glyphs = "abcdefghijklmnopqrstuvwxyz0123456789";

export const clamp = (t: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, t));

export const mapRange = (t: number, a: number, b: number): number =>
  a === b ? Number(t >= b) : clamp((t - a) / (b - a));

export const easeOutCubic = (t: number): number => 1 - (1 - clamp(t)) ** 3;

export const easeInOutCubic = (t: number): number => {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
};

/** Helper truy vấn phần tử bắt buộc trong DOM cảnh để tránh ép kiểu hoặc non-null assertion. */
export function queryEl<T extends HTMLElement = HTMLElement>(
  parent: ParentNode,
  selector: string,
): T {
  const el = parent.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Missing required scene element: ${selector}`);
  }
  return el;
}

/** Split text nodes, preserving inline markup, explicit breaks and whole graphemes. */
export function splitChars(el: HTMLElement): HTMLSpanElement[] {
  const cached = splitCache.get(el);
  if (cached) return cached;
  const chars: HTMLSpanElement[] = [];
  const doc = el.ownerDocument;

  function split(node: Node): void {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const fragment = doc.createDocumentFragment();
        let word: HTMLSpanElement | null = null;
        const text = child.textContent ?? "";
        for (const { segment } of segmenter.segment(text)) {
          const span = doc.createElement("span");
          span.className = "ch";
          span.textContent = segment === " " ? "\u00a0" : segment;
          span.setAttribute("aria-hidden", "true");
          chars.push(span);
          // Word wrappers prevent headings breaking in the middle of Vietnamese words.
          if (/\s/u.test(segment)) {
            word = null;
            fragment.append(span);
          } else {
            if (!word) {
              word = doc.createElement("span");
              word.className = "word";
              fragment.append(word);
            }
            word.append(span);
          }
        }
        (child as ChildNode).replaceWith(fragment);
      } else if (child instanceof Element && child.tagName !== "BR") {
        split(child);
      }
    }
  }

  // Keep the readable, unscrambled label available to assistive technology.
  function read(node: Node): string {
    return [...node.childNodes]
      .map((child) =>
        child.nodeType === Node.TEXT_NODE
          ? (child.textContent ?? "")
          : child instanceof Element && child.tagName === "BR"
            ? "\n"
            : read(child),
      )
      .join("");
  }

  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", read(el));
  split(el);
  splitCache.set(el, chars);
  return chars;
}

/** Every visual state depends only on t; no clocks, timers or accumulated progress. */
export function createReveal(
  el: HTMLElement,
  { type = "chars" }: RevealOptions = {},
): RevealController {
  if (
    type !== "chars" &&
    type !== "scramble" &&
    type !== "blur" &&
    type !== "type"
  ) {
    throw new RangeError(`Unknown text reveal: ${String(type)}`);
  }
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (type === "blur") {
    return {
      set(t: number) {
        const p = easeOutCubic(clamp(t));
        el.style.opacity = String(p);
        if (reducedMotion || p > 0.995) {
          el.style.filter = "none";
          el.style.transform = "none";
        } else {
          el.style.filter = `blur(${8 * (1 - p)}px)`;
          el.style.transform = `translate3d(0, ${12 * (1 - p)}px, 0)`;
        }
      },
    };
  }

  const chars = splitChars(el);
  const originals: string[] = chars.map((span) => span.textContent ?? "");
  const count = chars.length;
  let previousStep = -1;
  let caret: HTMLSpanElement | null = null;
  const breaks: Array<{ node: HTMLBRElement; at: number }> = [];

  if (type === "type") {
    caret = el.ownerDocument.createElement("span");
    caret.className = "text-caret";
    caret.setAttribute("aria-hidden", "true");
    el.append(caret);
    // A <br> appears once the character immediately before it has been typed.
    let seen = 0;
    for (const node of el.querySelectorAll(".ch, br")) {
      if (node instanceof HTMLBRElement) breaks.push({ node, at: seen });
      else seen += 1;
    }
  }

  return {
    set(t: number) {
      const p = clamp(t);
      if (type === "type") {
        const step = reducedMotion
          ? p > 0.02
            ? count
            : 0
          : Math.round(p * count);
        if (caret) {
          caret.style.opacity =
            reducedMotion || p === 0 || p >= 0.995 ? "0" : "1";
        }
        if (step === previousStep) return;
        chars.forEach((span, i) => {
          span.style.display = i < step ? "" : "none";
        });
        breaks.forEach(({ node, at }) => {
          node.style.display = step >= at ? "" : "none";
        });
        previousStep = step;
        return;
      }

      if (reducedMotion) {
        const faded = easeOutCubic(p);
        chars.forEach((span, i) => {
          const orig = originals[i] ?? "";
          if (span.textContent !== orig) span.textContent = orig;
          span.style.opacity = String(faded);
          span.style.transform = "none";
        });
        return;
      }

      chars.forEach((span, i) => {
        const orig = originals[i] ?? "";
        const start = count > 1 ? (i / (count - 1)) * 0.72 : 0;
        const local = mapRange(p, start, start + 0.28);
        if (type === "chars") {
          const eased = easeOutCubic(local);
          span.style.opacity = String(eased);
          span.style.transform =
            eased > 0.995 ? "none" : `translate3d(0, ${0.55 * (1 - eased)}em, 0)`;
        } else {
          // Integer hashing is deterministic when a user scrubs backwards.
          let seed =
            Math.imul(i + 1, 374761393) ^
            Math.imul(Math.floor(p * 60) + 1, 668265263);
          seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
          const char =
            p === 1 || local === 1 || /\s/u.test(orig)
              ? orig
              : (glyphs[(seed >>> 0) % glyphs.length] ?? orig);
          if (span.textContent !== char) span.textContent = char;
          span.style.opacity = String(mapRange(p, start, start + 0.08));
        }
      });
    },
  };
}
