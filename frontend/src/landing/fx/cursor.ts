type StylableElement = HTMLElement | SVGElement;

function isStylableElement(target: EventTarget | null): target is StylableElement {
  return target instanceof HTMLElement || target instanceof SVGElement;
}

export default function initCursor(): () => void {
  const fine = window.matchMedia("(pointer: fine)");
  const coarse = window.matchMedia("(pointer: coarse)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4v16m-6-6 6 6 6-6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  document.body.append(cursor);

  const story = document.querySelector<HTMLElement>("#story");
  const nativeCursor = document.documentElement.style.cursor;
  let hovered: StylableElement | null = null;
  let hoveredCursor = "";
  let bounds = { start: 0, end: 0 };
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let frame = 0;
  let visible = false;

  const enabled = (): boolean =>
    fine.matches && !coarse.matches && !reduced.matches;

  function restoreTarget(): void {
    if (hovered) hovered.style.cursor = hoveredCursor;
    hovered = null;
  }

  function tick(): void {
    const follow = 0.2;
    x += (targetX - x) * follow;
    y += (targetY - y) * follow;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    frame = visible ? requestAnimationFrame(tick) : 0;
  }

  function hide(): void {
    visible = false;
    cursor.style.opacity = "0";
    document.documentElement.style.cursor = nativeCursor;
    restoreTarget();
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  function move(event: PointerEvent): void {
    if (!enabled() || event.pointerType === "touch") return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!visible) {
      x = targetX;
      y = targetY;
      visible = true;
      cursor.style.opacity = "1";
      document.documentElement.style.cursor = "none";
    }
    // Inline cursor values also override the browser's default link/button cursor.
    if (event.target !== hovered) {
      restoreTarget();
      if (isStylableElement(event.target)) {
        hovered = event.target;
        hoveredCursor = hovered.style.cursor;
        hovered.style.cursor = "none";
      }
    }
    const interactive =
      event.target instanceof Element
        ? Boolean(event.target.closest('a, button, summary, [role="button"]'))
        : false;
    cursor.style.setProperty("--cursor-scale", interactive ? "1.55" : "1");
    cursor.classList.toggle("is-interactive", interactive);
    if (!frame) tick();
  }

  function scroll(): void {
    const inside =
      Boolean(story) &&
      window.scrollY >= bounds.start &&
      window.scrollY < bounds.end;
    cursor.style.setProperty("--arrow-opacity", inside ? "1" : "0");
  }

  function measure(): void {
    if (story) {
      const rect = story.getBoundingClientRect();
      bounds = {
        start: rect.top + window.scrollY,
        end: rect.bottom + window.scrollY,
      };
    }
    scroll();
  }

  function changePointer(): void {
    cursor.style.display = enabled() ? "" : "none";
    if (!enabled()) hide();
  }

  function visibility(): void {
    if (document.hidden) hide();
  }

  document.addEventListener("pointermove", move, { passive: true });
  document.documentElement.addEventListener("pointerleave", hide);
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", hide);
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  fine.addEventListener("change", changePointer);
  coarse.addEventListener("change", changePointer);
  reduced.addEventListener("change", changePointer);
  const observer = new ResizeObserver(measure);
  if (story) observer.observe(story);
  measure();
  changePointer();

  return function destroy(): void {
    hide();
    observer.disconnect();
    document.removeEventListener("pointermove", move);
    document.documentElement.removeEventListener("pointerleave", hide);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", hide);
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("resize", measure);
    fine.removeEventListener("change", changePointer);
    coarse.removeEventListener("change", changePointer);
    reduced.removeEventListener("change", changePointer);
    cursor.remove();
  };
}
