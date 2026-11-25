import { createReveal, easeOutCubic, mapRange } from '../fx/text.js';

const highlightedSolution = [
  '<span class="tok-kw">def</span> <span class="tok-fn">two_sum</span>(nums, target):',
  '    seen = {}',
  '    <span class="tok-kw">for</span> i, num <span class="tok-kw">in</span> <span class="tok-bi">enumerate</span>(nums):',
  '        complement = target - num',
  '        <span class="tok-kw">if</span> complement <span class="tok-kw">in</span> seen:',
  '            <span class="tok-kw">return</span> [seen[complement], i]',
  '        seen[num] = i',
].join('\n');

const testTelemetry = [
  { id: '01', time: '11ms' },
  { id: '02', time: '14ms' },
  { id: '03', time: '16ms' },
  { id: '04', time: '18ms' },
  { id: '05', time: '21ms' },
  { id: '06', time: '23ms' },
];

// Digit reels let update() animate counters with style writes only.
function counterMarkup(value, label) {
  const digits = String(value)
    .split('')
    .map(
      (_, i, all) => `
    ${all.length === 4 && i === 1 ? '<span class="counter-separator">.</span>' : ''}
    <span class="counter-digit"><span class="digit-track">${'0123456789'
      .split('')
      .map((d) => `<span>${d}</span>`)
      .join('')}</span></span>`,
    )
    .join('');
  return `<li aria-label="${value.toLocaleString('vi-VN')}+ ${label}"><span class="counter-value" aria-hidden="true">${digits}<span>+</span></span><span class="counter-label" aria-hidden="true">${label}</span></li>`;
}

export default function createScene(root) {
  root.innerHTML = `
    <div class="code-left">
      <div class="code-header">
        <p class="scene-index">04 · Luyện code</p>
        <h2 class="scene-title">Luyện đến khi<br><span class="accent-text">Accepted.</span></h2>
      </div>

      <div class="code-stats">
        <ul>
          ${counterMarkup(1200, 'Bài tập chọn lọc')}
          ${counterMarkup(40, 'Chủ đề trọng tâm')}
          ${counterMarkup(300, 'Câu hỏi thực tế')}
        </ul>
        <p class="scene-footnote">*Số liệu minh họa · Ngân hàng đề đã kiểm duyệt (BR4)</p>
      </div>
    </div>

    <div class="code-workbench">
      <div class="editor-bar">
        <span class="editor-file"><i aria-hidden="true"></i>two_sum.py</span>
        <span class="editor-lang">Python 3.11</span>
      </div>
      <div class="editor-code">
        <span class="line-numbers" aria-hidden="true">01<br>02<br>03<br>04<br>05<br>06<br>07</span>
        <pre><code class="solution"></code></pre>
      </div>
      <div class="editor-footer">
        <span>1 CPU · 256MB · network=none</span>
        <span>O(n) time · O(n) space</span>
      </div>

      <ul class="test-cases" aria-label="6 test case minh họa">
        ${testTelemetry
          .map(
            (tc) => `<li class="test-row">
              <span class="test-name">Test ${tc.id}</span>
              <span class="test-meta">${tc.time}</span>
              <span class="test-mark" aria-label="Đạt">Passed</span>
            </li>`,
          )
          .join('')}
      </ul>

      <div class="accepted-stamp" aria-hidden="true">
        <strong>Accepted</strong>
        <span>6/6 test đạt · 18ms · 15.2MB</span>
      </div>
    </div>`;

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const code = root.querySelector('.solution');
  code.innerHTML = highlightedSolution;
  const typing = createReveal(code, { type: 'type' });
  const title = createReveal(root.querySelector('.scene-title'), { type: 'chars' });
  const editor = root.querySelector('.code-workbench');
  const testRows = [...root.querySelectorAll('.test-row')];
  const tests = [...root.querySelectorAll('.test-mark')];
  const metas = [...root.querySelectorAll('.test-meta')];
  const stamp = root.querySelector('.accepted-stamp');
  const maxValues = [1200, 40, 300];
  const counters = [...root.querySelectorAll('.counter-value')].map((el, i) => ({
    max: maxValues[i],
    digits: [...el.querySelectorAll('.counter-digit')],
    tracks: [...el.querySelectorAll('.digit-track')],
    separator: el.querySelector('.counter-separator'),
  }));

  function update(t) {
    root.style.opacity = String(mapRange(t, 0, 0.1) * (1 - mapRange(t, 0.9, 1)));
    title.set(mapRange(t, 0.03, 0.28));

    const enter = easeOutCubic(mapRange(t, 0.05, 0.2));
    editor.style.opacity = String(enter);
    editor.style.transform = reducedMotion || enter > 0.995
      ? 'none'
      : `translate3d(0, ${14 * (1 - enter)}px, 0)`;

    typing.set(mapRange(t, 0.11, 0.56));

    const counting = reducedMotion ? 1 : easeOutCubic(mapRange(t, 0.12, 0.72));
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
      const passed = mapRange(t, 0.56 + i * 0.035, 0.6 + i * 0.035);
      el.style.opacity = String(passed);
      metas[i].style.opacity = String(0.35 + passed * 0.65);
      testRows[i].classList.toggle('is-passed', passed > 0.6);
    });

    const accepted = easeOutCubic(mapRange(t, 0.79, 0.89));
    stamp.style.opacity = String(accepted);
    stamp.style.transform = reducedMotion
      ? 'rotate(-6deg)'
      : `rotate(-6deg) scale(${1.14 - 0.14 * accepted})`;
  }

  update(0);
  return { update };
}
