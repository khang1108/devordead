import { useEffect, useRef } from "react";

/**
 * Waveform ghi âm (NFR08). Có analyser → vẽ theo âm lượng micro thật; không có → sóng giả lập khi active.
 * Màu lấy từ biến CSS để đổi được theo nền (sáng/tối).
 */
export default function Waveform({ analyser, active = false, bars = 48, height = 72, color = "var(--brand)", idleColor = "var(--ink-3)", label = "Mức âm lượng micro" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const css = getComputedStyle(canvas);
    const resolve = (c) => (c.startsWith("var(") ? css.getPropertyValue(c.slice(4, -1)).trim() : c);
    const on = resolve(color);
    const off = resolve(idleColor);
    let raf = 0;
    const levels = new Array(bars).fill(0.08);

    const draw = (t) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = height * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, height);

      if (active && analyser && data) {
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / 2 / bars) || 1;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j];
          const v = sum / step / 255;
          levels[i] = levels[i] * 0.55 + Math.min(1, v * 1.6) * 0.45;
        }
      } else if (active && !reduce) {
        for (let i = 0; i < bars; i++) {
          const v = 0.25 + 0.35 * Math.abs(Math.sin(t / 260 + i * 0.55)) * Math.abs(Math.sin(t / 610 + i * 0.21));
          levels[i] = levels[i] * 0.7 + v * 0.3;
        }
      } else {
        for (let i = 0; i < bars; i++) levels[i] = levels[i] * 0.85 + 0.06 * 0.15;
      }

      const gap = 4;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);
      ctx.fillStyle = active ? on : off;
      for (let i = 0; i < bars; i++) {
        const h = Math.max(4, levels[i] * height);
        const x = i * (bw + gap);
        const y = (height - h) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, h, bw / 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, active, bars, height, color, idleColor]);

  return <canvas ref={canvasRef} role="img" aria-label={label} style={{ width: "100%", height }} />;
}
