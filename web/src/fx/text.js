const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
const splitCache = new WeakMap();
const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>';

export const clamp = (t, min = 0, max = 1) => Math.min(max, Math.max(min, t));
export const mapRange = (t, a, b) => a === b ? Number(t >= b) : clamp((t - a) / (b - a));
export const easeOutCubic = (t) => 1 - (1 - clamp(t)) ** 3;

/** Split text nodes, preserving inline markup, explicit breaks and whole graphemes. */
export function splitChars(el) {
  if (splitCache.has(el)) return splitCache.get(el);
  const chars = [];
  const doc = el.ownerDocument;

  function split(node) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        const fragment = doc.createDocumentFragment();
        let word;
        for (const { segment } of segmenter.segment(child.textContent)) {
          const span = doc.createElement('span');
          span.className = 'ch';
          span.textContent = segment === ' ' ? '\u00a0' : segment;
          span.setAttribute('aria-hidden', 'true');
          chars.push(span);
          // Word wrappers prevent headings breaking in the middle of Vietnamese words.
          if (/\s/u.test(segment)) {
            word = null;
            fragment.append(span);
          } else {
            if (!word) {
              word = doc.createElement('span');
              word.className = 'word';
              fragment.append(word);
            }
            word.append(span);
          }
        }
        child.replaceWith(fragment);
      } else if (child.nodeType === 1 && child.tagName !== 'BR') {
        split(child);
      }
    }
  }

  // Keep the readable, unscrambled label available to assistive technology.
  function read(node) {
    return [...node.childNodes].map((child) => child.nodeType === 3
      ? child.textContent : child.tagName === 'BR' ? '\n' : read(child)).join('');
  }
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', read(el));
  split(el);
  splitCache.set(el, chars);
  return chars;
}

/** Every visual state depends only on t; no clocks, timers or accumulated progress. */
export function createReveal(el, { type = 'chars' } = {}) {
  if (!['chars', 'scramble', 'blur', 'type'].includes(type)) {
    throw new RangeError(`Unknown text reveal: ${type}`);
  }
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (type === 'blur') {
    return {
      set(t) {
        const p = easeOutCubic(reducedMotion ? 1 : t);
        el.style.opacity = String(p);
        el.style.filter = `blur(${12 * (1 - p)}px)`;
        el.style.transform = `translate3d(0, ${20 * (1 - p)}px, 0)`;
      },
    };
  }

  const chars = splitChars(el);
  const originals = chars.map((span) => span.textContent);
  const count = chars.length;
  let previousStep = -1;
  let caret;
  let breaks = [];

  if (type === 'type') {
    caret = el.ownerDocument.createElement('span');
    caret.className = 'text-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '▌';
    el.append(caret);
    // A <br> appears once the character immediately before it has been typed.
    let seen = 0;
    for (const node of el.querySelectorAll('.ch, br')) {
      if (node.tagName === 'BR') breaks.push({ node, at: seen });
      else seen += 1;
    }
  }

  return {
    set(t) {
      const p = reducedMotion ? 1 : clamp(t);
      if (type === 'type') {
        const step = Math.round(p * count);
        caret.style.opacity = p === 1 ? '0' : '1';
        if (step === previousStep) return;
        chars.forEach((span, i) => { span.style.display = i < step ? '' : 'none'; });
        breaks.forEach(({ node, at }) => { node.style.display = step >= at ? '' : 'none'; });
        previousStep = step;
        return;
      }

      chars.forEach((span, i) => {
        const start = count > 1 ? (i / (count - 1)) * 0.72 : 0;
        const local = mapRange(p, start, start + 0.28);
        if (type === 'chars') {
          const eased = easeOutCubic(local);
          span.style.opacity = String(eased);
          span.style.transform = `translate3d(0, ${0.85 * (1 - eased)}em, 0)`;
        } else {
          // Integer hashing is deterministic when a user scrubs backwards.
          let seed = Math.imul(i + 1, 374761393) ^ Math.imul(Math.floor(p * 60) + 1, 668265263);
          seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
          const char = p === 1 || local === 1 || /\s/u.test(originals[i])
            ? originals[i] : glyphs[(seed >>> 0) % glyphs.length];
          if (span.textContent !== char) span.textContent = char;
          span.style.opacity = String(mapRange(p, start, start + 0.08));
        }
      });
    },
  };
}
