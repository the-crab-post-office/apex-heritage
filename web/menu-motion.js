// Cancel superseded animations so rapid selections never leave stale previews.
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
export function revealMenu(element, direction = 1) {
  if (!element) return;
  element.getAnimations().forEach((a) => a.cancel());
  if (reducedMotion()) return;
  element.animate(
    [
      { opacity: 0, transform: `translateX(${direction * 28}px)` },
      { opacity: 1, transform: "translateX(0)" },
    ],
    { duration: 340, easing: "cubic-bezier(.2,.8,.2,1)" },
  );
}
export function centerSelection(strip, smooth = true) {
  const selected = strip?.querySelector('[aria-pressed="true"]');
  if (!selected) return;
  const a = strip.getBoundingClientRect(),
    b = selected.getBoundingClientRect();
  strip.scrollTo({
    left: strip.scrollLeft + b.left - a.left - (a.width - b.width) / 2,
    behavior: smooth && !reducedMotion() ? "smooth" : "instant",
  });
}
export function wireCarousel(strip, previous, next) {
  const buttons = () => [...strip.querySelectorAll("button")];
  const select = (delta) => {
    const list = buttons(),
      i = list.findIndex((b) => b.getAttribute("aria-pressed") === "true");
    list[Math.max(0, Math.min(list.length - 1, i + delta))]?.click();
  };
  previous.onclick = () => select(-1);
  next.onclick = () => select(1);
  strip.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const list = buttons();
    if (e.key === "Home") list[0]?.click();
    else if (e.key === "End") list.at(-1)?.click();
    else select(e.key === "ArrowLeft" ? -1 : 1);
    strip
      .querySelector('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
  });
  // Native overflow supplies touch drag/trackpad scrolling without intercepting page scroll.
  return () => {
    const list = buttons(),
      i = list.findIndex((b) => b.getAttribute("aria-pressed") === "true");
    previous.disabled = i <= 0;
    next.disabled = i >= list.length - 1;
    centerSelection(strip);
  };
}
