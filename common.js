// © 2026 Mikatox TV. Tous droits réservés.
// La couleur des LED est aussi la couleur d'accent du site : choisie une fois, elle suit le visiteur de page en page.
const KEY = "mikatox_site_led2";

export function setAccent(hex) {
  const root = document.documentElement;
  root.style.setProperty("--led", hex);
  root.dataset.led = hex;
  try {
    localStorage.setItem(KEY, hex);
  } catch {
    /* navigation privée : la couleur ne sera simplement pas retenue */
  }
}

export function savedAccent(fallback = "#e4901e") {
  try {
    const v = localStorage.getItem(KEY);
    if (v && /^#[0-9a-f]{6}$/i.test(v)) return v;
  } catch {
    /* rien à relire */
  }
  return fallback;
}

/** Relie un groupe de pastilles de couleur (role="radio", data-led) à la couleur choisie. */
export function wireSwatches(group, onPick) {
  const pick = (btn) => {
    group.querySelectorAll("[data-led]").forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
    onPick(btn.dataset.led);
  };
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-led]");
    if (btn) pick(btn);
  });
  group.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(e.key)) return;
    const all = [...group.querySelectorAll("[data-led]")];
    const i = all.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = all[(i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : all.length - 1)) % all.length];
    next.focus();
    pick(next);
  });
  return (hex) => {
    const btn = group.querySelector(`[data-led="${hex}"]`);
    if (btn) group.querySelectorAll("[data-led]").forEach((b) => b.setAttribute("aria-checked", String(b === btn)));
  };
}

export function clock(s) {
  s = Math.max(0, Math.floor(s));
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}
