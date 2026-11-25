import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

const solution = `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i`;

// Digit reels let update() animate counters with style writes only.
function counterMarkup(value, label) {
  const digits = String(value).split('').map((_, i, all) => `
    ${all.length === 4 && i === 1 ? '<span class="counter-separator">.</span>' : ''}
    <span class="counter-digit"><span class="digit-track">${'0123456789'.split('').map((d) => `<span>${d}</span>`).join('')}</span></span>`).join('');
  return `<li aria-label="${value.toLocaleString('vi-VN')}+ ${label}"><span class="counter-value" aria-hidden="true">${digits}<span>+</span></span><span class="counter-label" aria-hidden="true">${label}</span></li>`;
}

export default function createScene(root) {
  root.innerHTML = `
    <p class="scene-index">04 — LUYỆN CODE</p>
    <h2 class="scene-title">LUYỆN ĐẾN KHI<br><span class="accent-text">ACCEPTED</span></h2>
    <div class="code-stats"><ul>${counterMarkup(1200, 'bài tập')}${counterMarkup(40, 'chủ đề')}${counterMarkup(300, 'câu hỏi theo công ty')}</ul><p class="scene-footnote">*số liệu minh họa</p></div>
    <div class="code-workbench">
      <div class="editor">
        <div class="editor-bar"><span><i aria-hidden="true"></i>two_sum.py</span><span>PYTHON 3</span></div>
        <div class="editor-code"><span class="line-numbers" aria-hidden="true">01<br>02<br>03<br>04<br>05<br>06<br>07</span><pre><code class="solution"></code></pre></div>
        <div class="editor-footer"><span>01 / TWO SUM</span><span>O(n)</span></div>
      </div>
      <ul class="test-cases" aria-label="6 test case minh họa">${Array.from({ length: 6 }, (_, i) => `<li><span>Test ${i + 1}</span><span class="test-mark" aria-label="Đạt">✓</span></li>`).join('')}</ul>
      <div class="accepted-stamp" aria-hidden="true">ACCEPTED<span>ALL TESTS PASSED / 06</span></div>
    </div>`;

  const code = root.querySelector('.solution');
  code.textContent = solution;
  const typing = createReveal(code, { type: 'type' });
  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const editor = root.querySelector('.code-workbench');
  const tests = [...root.querySelectorAll('.test-mark')];
  const stamp = root.querySelector('.accepted-stamp');
  const maxValues = [1200, 40, 300];
  const counters = [...root.querySelectorAll('.counter-value')].map((el, i) => ({
    max: maxValues[i], digits: [...el.querySelectorAll('.counter-digit')],
    tracks: [...el.querySelectorAll('.digit-track')], separator: el.querySelector('.counter-separator'),
  }));

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.03, 0.28));
    const enter = easeOutCubic(mapRange(t, 0.06, 0.2));
    editor.style.opacity = String(enter);
    editor.style.transform = `translate3d(0, ${24 * (1 - enter)}px, 0)`;
    typing.set(mapRange(t, 0.12, 0.58));
    const counting = easeOutCubic(mapRange(t, 0.12, 0.72));
    counters.forEach(({ max, digits, tracks, separator }) => {
      const value = Math.round(max * counting);
      tracks.forEach((track, i) => {
        const place = 10 ** (tracks.length - i - 1);
        track.style.transform = `translate3d(0, ${-10 * (Math.floor(value / place) % 10)}%, 0)`;
        digits[i].style.display = i < tracks.length - 1 && value < place ? 'none' : '';
      });
      if (separator) separator.style.display = value >= 1000 ? '' : 'none';
    });
    tests.forEach((el, i) => {
      const passed = mapRange(t, 0.58 + i * 0.032, 0.62 + i * 0.032);
      el.style.opacity = String(passed);
      el.style.transform = `scale(${0.7 + passed * 0.3})`;
    });
    const accepted = easeOutCubic(mapRange(t, 0.8, 0.89));
    stamp.style.opacity = String(accepted);
    stamp.style.transform = `rotate(-8deg) scale(${1.35 - 0.35 * accepted})`;
  }
  update(0);
  return { update };
}
