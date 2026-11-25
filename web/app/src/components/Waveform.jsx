import { useEffect, useRef } from "react";
import { RuleTag } from "./ui.jsx";

/**
 * Studio Waveform ghi âm (NFR08 + NFR01) — thiết kế tối giản chuẩn phòng thu trên nền sáng/trung tính.
 * Có analyser → vẽ theo âm lượng micro thật; không có → sóng hài hòa đa dải khi active.
 */
export default function Waveform({
  analyser,
  active = false,
  bars = 48,
  height = 56,
  color = "var(--ink)",
  idleColor = "rgba(17, 20, 24, 0.14)",
  label = "Mức âm lượng micro",
  showBadge,
  latencyLabel = "Phản hồi ≤ 2,5s",
}) {
  const canvasRef = useRef(null);
  const displayMeta = showBadge ?? height >= 44;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const css = getComputedStyle(canvas);
    const resolve = (c) => (c.startsWith("var(") ? css.getPropertyValue(c.slice(4, -1)).trim() || "#111418" : c);
    const onColor = resolve(color);
    const offColor = resolve(idleColor);
    const accentColor = resolve("var(--brand)");

    let raf = 0;
    const levels = new Array(bars).fill(0.08);

    const drawRoundBar = (x, y, w, h, r) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.rect(x, y, w, h);
      }
      ctx.fill();
    };

    const draw = (t) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(40, canvas.clientWidth || 240);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, height);

      if (height >= 40) {
        ctx.fillStyle = "rgba(17, 20, 24, 0.06)";
        ctx.fillRect(0, Math.floor(height / 2), w, 1);
      }

      if (active && analyser && data) {
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / 2 / bars) || 1;
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += data[i * step + j];
          const v = sum / step / 255;
          levels[i] = levels[i] * 0.58 + Math.min(1, v * 1.55) * 0.42;
        }
      } else if (active && !reduce) {
        for (let i = 0; i < bars; i++) {
          const norm = bars > 1 ? i / (bars - 1) : 0.5;
          const envelope = 0.32 + 0.68 * Math.sin(norm * Math.PI);
          const f1 = Math.abs(Math.sin(t / 220 + i * 0.46));
          const f2 = Math.abs(Math.sin(t / 490 - i * 0.22 + 1.1));
          const target = Math.min(0.9, (0.14 + 0.72 * f1 * f2) * envelope);
          levels[i] = levels[i] * 0.68 + target * 0.32;
        }
      } else if (active && reduce) {
        for (let i = 0; i < bars; i++) {
          const norm = bars > 1 ? i / (bars - 1) : 0.5;
          levels[i] = 0.18 + 0.38 * Math.sin(norm * Math.PI) * (0.65 + 0.35 * (((i * 7) % 3) / 2));
        }
      } else {
        for (let i = 0; i < bars; i++) {
          levels[i] = levels[i] * 0.85 + 0.07 * 0.15;
        }
      }

      const gap = bars > 28 ? 3 : 2.5;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);

      for (let i = 0; i < bars; i++) {
        const lvl = levels[i];
        const h = Math.max(3, lvl * (height - 4));
        const x = i * (bw + gap);
        const y = (height - h) / 2;

        ctx.fillStyle = active ? (lvl > 0.58 ? accentColor : onColor) : offColor;
        drawRoundBar(x, y, bw, h, bw / 2);
      }

      if (!reduce && !document.hidden) {
        raf = requestAnimationFrame(draw);
      } else {
        raf = 0;
      }
    };

    const start = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    const onVis = () => {
      if (document.hidden && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!document.hidden) {
        start();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [analyser, active, bars, height, color, idleColor]);

  if (!displayMeta) {
    return <canvas ref={canvasRef} role="img" aria-label={label} style={{ width: "100%", height, display: "block" }} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <canvas ref={canvasRef} role="img" aria-label={label} style={{ width: "100%", height, display: "block" }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span className="t-body-s c-ink2" style={{ fontVariantNumeric: "tabular-nums" }}>
          {active ? "Đang thu trực tiếp · 16 kHz · −14 dB" : "Micro sẵn sàng · 16 kHz mono"}
        </span>
        <RuleTag code="NFR01">{latencyLabel}</RuleTag>
      </div>
    </div>
  );
}
