import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { createWorld } from "./three/world.js";
import { createDirector } from "./story/director.js";
import initCursor from "./fx/cursor.js";

gsap.registerPlugin(ScrollTrigger);

const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");

async function fontsReady() {
  // Đảm bảo bộ font sentence-case Plus Jakarta Sans + Be Vietnam Pro + JetBrains Mono tải xong trước khi vẽ CanvasTexture
  const sample = "Nguyễn Minh Anh Thư mời nhận việc ĐỆ Ư Ơ Ạ Ấ Ầ Ổ Ữ 0123456789";
  const wanted = [
    '600 72px "Plus Jakarta Sans"',
    '500 32px "Plus Jakarta Sans"',
    '600 32px "Be Vietnam Pro"',
    '500 26px "Be Vietnam Pro"',
    '400 26px "Be Vietnam Pro"',
    '600 28px "JetBrains Mono"',
    '400 22px "JetBrains Mono"',
  ];
  const timeout = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f, sample))), timeout]);
}

async function main() {
  const params = new URLSearchParams(location.search);

  // ?palette=sky|mono|blueprint|terminal|coral|forest → đổi bảng màu trước khi dựng thế giới 3D
  const palette = params.get("palette");
  if (palette) {
    document.documentElement.dataset.palette = palette;
  }

  await fontsReady();

  const story = document.getElementById("story");
  const canvas = document.getElementById("webgl");
  const overlay = document.getElementById("overlay");

  const world = createWorld(canvas, { reducedMotion: motionQuery.matches });
  const director = createDirector(overlay);

  try {
    initCursor();
  } catch (err) {
    console.error("[cursor]", err);
  }

  motionQuery.addEventListener("change", (e) => {
    world.setReducedMotion(e.matches);
  });

  // Tự động đồng bộ thế giới 3D nếu html[data-palette] thay đổi trực tiếp
  let currentPaletteAttr = document.documentElement.dataset.palette || "";
  const paletteObserver = new MutationObserver(() => {
    const next = document.documentElement.dataset.palette || "";
    if (next === currentPaletteAttr) return;
    currentPaletteAttr = next;
    requestAnimationFrame(() => {
      world.refreshPalette();
    });
  });
  paletteObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-palette"],
  });

  const reduceMotion = motionQuery.matches;
  const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    document.addEventListener("click", (e) => {
      const link = e.target.closest?.('a[href^="#"]');
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href) return;
      if (href === "#") {
        e.preventDefault();
        lenis.scrollTo(0, { duration: 1.6 });
        return;
      }
      let target = null;
      try {
        target = document.querySelector(href);
      } catch {
        target = null;
      }
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 2.0 });
    });
  }

  const freeze = params.has("freeze");
  let progress = 0;

  const st = ScrollTrigger.create({
    trigger: story,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (!freeze) progress = self.progress;
    },
  });

  const jumpRaw = params.get("p");
  if (jumpRaw !== null) {
    const parsed = parseFloat(jumpRaw);
    if (Number.isFinite(parsed)) {
      const clamped = Math.min(1, Math.max(0, parsed));
      if (freeze) {
        progress = clamped;
      } else if (story) {
        const span = Math.max(0, story.offsetHeight - innerHeight);
        const y = story.offsetTop + clamped * span;
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else scrollTo(0, y);
        st.update();
        progress = clamped;
      }
    }
  }

  director.update(progress);
  world.update(progress, 0);

  const timer = new THREE.Timer();
  timer.connect(document);
  world.renderer.setAnimationLoop(() => {
    timer.update();
    const time = timer.getElapsed();
    world.update(progress, time);
    director.update(progress);
  });

  window.addEventListener("resize", () => {
    world.resize();
    director.resize();
    ScrollTrigger.refresh();
  });

  document.documentElement.classList.add("is-ready");
  if (params.has("debug")) {
    setInterval(
      () => console.log("[debug]", JSON.stringify({ y: scrollY, h: document.body.scrollHeight, progress })),
      1000,
    );
  }
}

main();
