import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";
import { createWorld } from "./three/world.js";
import { createDirector } from "./story/director.js";
import initCursor from "./fx/cursor.js";

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

async function fontsReady() {
  // Texture canvas (CV, nhãn lộ trình) cần font đã tải xong
  const wanted = ['900 64px "Unbounded"', '700 30px "Unbounded"', '500 30px "Be Vietnam Pro"', '400 22px "JetBrains Mono"'];
  const timeout = new Promise((r) => setTimeout(r, 2500));
  await Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f, "ĐỆ"))), timeout]);
}

async function main() {
  // ?palette=blueprint|terminal|coral|forest → thử bảng màu khác (mặc định: mono). Phải đặt trước khi tạo 3D.
  const palette = new URLSearchParams(location.search).get("palette");
  if (palette) document.documentElement.dataset.palette = palette;

  await fontsReady();

  const story = document.getElementById("story");
  const canvas = document.getElementById("webgl");
  const world = createWorld(canvas);
  const director = createDirector(document.getElementById("overlay"));
  try {
    initCursor();
  } catch (err) {
    console.error("[cursor]", err);
  }

  // cuộn mượt + đồng bộ ScrollTrigger
  const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    // link neo (#pricing…) cuộn bằng Lenis
    document.querySelectorAll('a[href^="#"]').forEach((a) =>
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length < 2) return;
        e.preventDefault();
        lenis.scrollTo(id, { duration: 2.2 });
      }),
    );
  }

  const params = new URLSearchParams(location.search);
  // ?p=0.5&freeze → giữ cố định tiến độ, không cuộn (dùng để chụp ảnh kiểm tra)
  const freeze = params.has("freeze");
  let progress = 0;
  ScrollTrigger.create({
    trigger: story,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (!freeze) progress = self.progress;
    },
  });

  // ?p=0.5 → nhảy tới tiến độ (tiện xem nhanh từng cảnh)
  const jump = params.get("p");
  if (freeze && jump !== null) progress = parseFloat(jump);
  else if (jump !== null) {
    const y = story.offsetTop + parseFloat(jump) * (story.offsetHeight - innerHeight);
    lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y);
    progress = parseFloat(jump);
  }

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
  if (new URLSearchParams(location.search).has("debug")) {
    setInterval(() => console.log("[debug]", JSON.stringify({ y: scrollY, h: document.body.scrollHeight, progress })), 1000);
  }
}

main();
