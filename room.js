// © 2026 Mikatox TV. Tous droits réservés.
// La chambre de stream en 3D, la nuit : bureau, écran (Stream Hub), tablette (le deck), micro, bandes LED, panneau
// ON AIR et fenêtre sur la ville. Tout est construit en code, sans modèle à télécharger. La page la pilote :
// couleur des LED, sub, raid, REC. Économe : résolution plafonnée, pause hors écran, version calme si l'utilisateur
// demande moins d'animations, et pas d'effet de lumière diffuse (bloom) sur les petites machines.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const FONT = "Manrope, system-ui, sans-serif";
const INK = "#120c09";
const TEXT = "#f6ede2";
const MUTED = "#a9a6b2";
const RED = "#ff3b4d";

export const TILES = ["LIVE", "REC", "SUB", "RAID", "BRB", "GAMEPLAY", "MICRO", "CLIP"];
const TILE_COLORS = { LIVE: "#d8323f", REC: "#ff6a3d", SUB: "#8e3cff", RAID: "#c2185b", BRB: "#4f46e5", GAMEPLAY: "#2563eb", MICRO: "#b45309", CLIP: "#0f766e" };

const CHAT = [
  ["Yassine", "#ff7a45", "le clutch de fou"], ["Nora", "#3ddc84", "première fois ici, trop bien"], ["Kenzo", "#7aa7ff", "GG !!"],
  ["Lina", "#ff8bd1", "on fait quoi après la mission ?"], ["Sami", "#ffd166", "le son est nickel ce soir"], ["Rayan", "#c9b3ff", "on veut le replay"],
  ["Inès", "#5ce1e6", "les LED orange, la classe"], ["Adam", "#ff9a8b", "go ranked après ?"],
];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function clock(s) {
  s = Math.max(0, Math.floor(s));
  return `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}:${pad2(s % 60)}`;
}

function canvasTexture(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx: canvas.getContext("2d"), tex };
}

// --- Écran du PC : Stream Hub (scène OBS, chat, alerte) ---
function drawMonitor(ctx, w, h, s, t) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#15151c";
  ctx.fillRect(0, 0, w, 64);
  ctx.font = `800 26px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText("MIKATOX", 26, 42);
  ctx.fillStyle = s.led;
  ctx.fillText("STREAM HUB", 150, 42);
  ctx.font = `700 20px ${FONT}`;
  ctx.fillStyle = "#3ddc84";
  ctx.fillText("● OBS connecté", w - 470, 40);
  if (s.rec) {
    ctx.fillStyle = Math.floor(t * 2) % 2 ? RED : "#7a1d26";
    ctx.fillText("● REC " + clock(t - s.recSince), w - 250, 40);
  } else {
    ctx.fillStyle = MUTED;
    ctx.fillText("REC prêt", w - 250, 40);
  }

  // Aperçu de la scène OBS : un faux jeu de nuit.
  const px = 26, py = 88, pw = w * 0.6, ph = h - 120;
  const g = ctx.createLinearGradient(0, py, 0, py + ph);
  g.addColorStop(0, "#1b1035");
  g.addColorStop(0.55, "#3a1450");
  g.addColorStop(1, "#0c0a14");
  rr(ctx, px, py, pw, ph, 16);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  rr(ctx, px, py, pw, ph, 16);
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const bx = px + i * (pw / 14), bh = 60 + ((i * 53) % 150);
    ctx.fillStyle = "#08060f";
    ctx.fillRect(bx, py + ph - bh, pw / 14 - 4, bh);
    ctx.fillStyle = "rgba(255,210,120,0.55)";
    for (let k = 0; k < 4; k++) if ((i + k) % 3) ctx.fillRect(bx + 8 + (k % 2) * 16, py + ph - bh + 14 + k * 26, 6, 9);
  }
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText("Scène : " + s.scene, px + 18, py + 34);
  ctx.restore();

  // Alerte du moment, par-dessus la scène.
  if (s.alert && t - s.alert.at < 4.5) {
    const k = Math.min(1, (t - s.alert.at) * 4) * Math.min(1, (4.5 - (t - s.alert.at)) * 3);
    ctx.globalAlpha = k;
    rr(ctx, px + 40, py + ph / 2 - 60, pw - 80, 120, 22);
    ctx.fillStyle = "rgba(10,8,18,0.86)";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = s.alert.kind === "raid" ? RED : s.led;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = TEXT;
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText(s.alert.title, px + pw / 2, py + ph / 2 - 6);
    ctx.font = `600 24px ${FONT}`;
    ctx.fillStyle = "#d9d4e2";
    ctx.fillText(s.alert.line, px + pw / 2, py + ph / 2 + 34);
    ctx.textAlign = "left";
    ctx.globalAlpha = 1;
  }

  // Chat qui défile.
  const cx = px + pw + 22, cw = w - cx - 22;
  ctx.font = `800 22px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText("Chat", cx, 112);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx, 126, cw, h - 150);
  ctx.clip();
  const lines = s.chat;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const [u, c, m] = lines[lines.length - 1 - i];
    const y = h - 36 - i * 58;
    ctx.font = `800 20px ${FONT}`;
    ctx.fillStyle = c;
    ctx.fillText(u, cx, y - 22);
    ctx.font = `400 20px ${FONT}`;
    ctx.fillStyle = TEXT;
    ctx.fillText(m.length > 30 ? m.slice(0, 29) + "…" : m, cx, y);
  }
  ctx.restore();
}

// --- Tablette : le deck ---
function deckLayout(w, h) {
  const cols = 4, gap = 14, top = 70, side = 20;
  const tw = (w - side * 2 - gap * (cols - 1)) / cols;
  const th = (h - top - 18 - gap) / 2;
  return TILES.map((name, i) => ({ name, x: side + (i % cols) * (tw + gap), y: top + Math.floor(i / cols) * (th + gap), w: tw, h: th }));
}

function drawDeck(ctx, w, h, s, t) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.font = `800 24px ${FONT}`;
  ctx.fillStyle = TEXT;
  ctx.fillText("MIKATOX", 22, 42);
  ctx.fillStyle = s.led;
  ctx.fillText("DECK", 142, 42);
  for (const tile of deckLayout(w, h)) {
    const on = (tile.name === "REC" && s.rec) || (tile.name === "LIVE" && s.live) || (tile.name === s.lastTile && t - s.lastTileAt < 0.6) || (tile.name === "GAMEPLAY" && s.scene === "Gameplay") || (tile.name === "BRB" && s.scene === "BRB");
    rr(ctx, tile.x, tile.y, tile.w, tile.h, 18);
    ctx.fillStyle = TILE_COLORS[tile.name];
    ctx.globalAlpha = on ? 1 : 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    if (on) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.font = `800 22px ${FONT}`;
    ctx.fillStyle = "#fff";
    ctx.fillText(tile.name, tile.x + tile.w / 2, tile.y + tile.h / 2 + 8);
    ctx.textAlign = "left";
  }
}

// --- Panneau ON AIR ---
function drawOnAir(ctx, w, h, on) {
  ctx.clearRect(0, 0, w, h);
  rr(ctx, 6, 6, w - 12, h - 12, 26);
  ctx.fillStyle = on ? "#3a0a10" : "#141418";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = on ? RED : "#2a2a33";
  ctx.stroke();
  ctx.font = `800 ${Math.round(h * 0.46)}px Unbounded, ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillStyle = on ? "#ff5a68" : "#3a3a44";
  ctx.fillText("ON AIR", w / 2, h * 0.66);
  ctx.textAlign = "left";
}

// --- Fenêtre : la ville la nuit (dessinée une fois) ---
function drawCity(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#090b1f");
  sky.addColorStop(0.7, "#24123e");
  sky.addColorStop(1, "#3b1640");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,240,220,0.9)";
  ctx.beginPath();
  ctx.arc(w * 0.78, h * 0.2, h * 0.06, 0, Math.PI * 2);
  ctx.fill();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let layer = 0; layer < 2; layer++) {
    for (let x = 0; x < w; ) {
      const bw = 30 + rnd() * 60, bh = h * (0.25 + rnd() * (layer ? 0.45 : 0.3));
      ctx.fillStyle = layer ? "#07060c" : "#140f22";
      ctx.fillRect(x, h - bh, bw, bh);
      for (let yy = h - bh + 10; yy < h - 6; yy += 14) for (let xx = x + 6; xx < x + bw - 6; xx += 11) if (rnd() > 0.72) {
        ctx.fillStyle = rnd() > 0.85 ? "rgba(228,144,30,0.8)" : "rgba(255,206,120,0.75)";
        ctx.fillRect(xx, yy, 4, 6);
      }
      x += bw + 4;
    }
  }
}

function box(w, h, d, r, mat) {
  return new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d), mat);
}

/**
 * Crée la chambre dans `container`. Renvoie les commandes : setLed, sub, raid, setRec, setLive, setScene,
 * et `onTile(fn)` pour les appuis sur la tablette 3D.
 */
export function createRoom(container, { compact = false } = {}) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const weak = (navigator.hardwareConcurrency || 4) <= 4 || Math.min(window.innerWidth, window.innerHeight) < 500;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !weak, powerPreference: "low-power" });
  } catch {
    document.documentElement.classList.add("no-webgl");
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, weak ? 1 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0d0907");
  scene.fog = new THREE.Fog("#0d0907", 7, 16);
  const camera = new THREE.PerspectiveCamera(compact ? 42 : 36, 1, 0.1, 50);

  const state = {
    led: "#e4901e", ledColor: new THREE.Color("#e4901e"), rec: false, recSince: 0, live: false, scene: "Gameplay",
    alert: null, chat: CHAT.slice(0, 6), lastTile: "", lastTileAt: -9, flash: null, power: true, bright: 1,
  };

  // Matières
  const wall = new THREE.MeshStandardMaterial({ color: "#191823", roughness: 0.92 });
  const floor = new THREE.MeshStandardMaterial({ color: "#0e0d13", roughness: 0.75, metalness: 0.1 });
  const wood = new THREE.MeshStandardMaterial({ color: "#16131a", roughness: 0.55, metalness: 0.15 });
  const metal = new THREE.MeshStandardMaterial({ color: "#2a2a33", roughness: 0.35, metalness: 0.8 });
  const black = new THREE.MeshStandardMaterial({ color: "#0b0b0f", roughness: 0.4, metalness: 0.5 });
  const ledMat = new THREE.MeshStandardMaterial({ color: "#000", emissive: state.ledColor.clone(), emissiveIntensity: 3.2 });

  // Pièce : sol, mur du fond, mur de gauche
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), floor);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), wall);
  back.position.set(0, 3, -1.6);
  scene.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), wall);
  left.rotation.y = Math.PI / 2;
  left.position.set(-3.6, 3, 2);
  scene.add(left);

  // Bande LED au mur, au-dessus du bureau, et sous le plateau
  const wallStrip = box(5.6, 0.035, 0.035, 0, ledMat);
  wallStrip.position.set(0.2, 2.35, -1.57);
  const deskStrip = box(3.1, 0.025, 0.025, 0, ledMat);
  deskStrip.position.set(0.2, 0.7, -0.55);
  scene.add(wallStrip, deskStrip);
  const washes = [-2.2, 0.2, 2.6].map((x) => {
    const l = new THREE.PointLight(state.ledColor, 9, 6, 1.6);
    l.position.set(x, 2.2, -1.25);
    scene.add(l);
    return l;
  });
  const under = new THREE.PointLight(state.ledColor, 2.5, 3, 2);
  under.position.set(0.2, 0.55, -0.4);
  scene.add(under);

  // Bureau
  const top = box(3.4, 0.07, 1.25, 0.02, wood);
  top.position.set(0.2, 0.75, -0.6);
  scene.add(top);
  for (const x of [-1.4, 1.8]) {
    const leg = box(0.06, 0.75, 1.1, 0, metal);
    leg.position.set(x, 0.37, -0.6);
    scene.add(leg);
  }

  // Écran : Stream Hub
  const mon = canvasTexture(1280, 720);
  const monitor = new THREE.Group();
  const bezel = box(1.9, 1.1, 0.06, 0.03, black);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.02), new THREE.MeshBasicMaterial({ map: mon.tex, toneMapped: false, color: "#d6d6d6" }));
  screen.position.z = 0.032;
  const neck = box(0.08, 0.45, 0.06, 0, metal);
  neck.position.set(0, -0.72, -0.05);
  const foot = box(0.5, 0.025, 0.3, 0.01, metal);
  foot.position.set(0, -0.94, 0.02);
  monitor.add(bezel, screen, neck, foot);
  monitor.position.set(-0.15, 1.73, -0.95);
  scene.add(monitor);
  const screenGlow = new THREE.PointLight("#8b7dff", 1.6, 2.6, 2);
  screenGlow.position.set(-0.15, 1.6, -0.3);
  scene.add(screenGlow);

  // Tablette sur son support : le deck (cliquable)
  const tab = canvasTexture(900, 600);
  const tablet = new THREE.Group();
  const tabBody = box(0.92, 0.62, 0.035, 0.03, black);
  const tabScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.56), new THREE.MeshBasicMaterial({ map: tab.tex, toneMapped: false, color: "#d6d6d6" }));
  tabScreen.position.z = 0.019;
  tablet.add(tabBody, tabScreen);
  tablet.position.set(1.25, 1.08, -0.25);
  tablet.rotation.set(-0.5, -0.38, 0);
  const stand = box(0.06, 0.32, 0.06, 0, metal);
  stand.position.set(1.3, 0.92, -0.38);
  stand.rotation.x = -0.4;
  scene.add(tablet, stand);

  // Clavier
  const kb = box(1.1, 0.035, 0.36, 0.015, black);
  kb.position.set(-0.15, 0.8, -0.2);
  const kbGlow = box(1.06, 0.006, 0.32, 0, new THREE.MeshStandardMaterial({ color: "#000", emissive: state.ledColor.clone(), emissiveIntensity: 0.35 }));
  kbGlow.position.set(-0.15, 0.82, -0.2);
  scene.add(kb, kbGlow);

  // Micro sur bras articulé
  const mic = new THREE.Group();
  const clamp = box(0.12, 0.12, 0.12, 0.02, metal);
  clamp.position.set(-1.45, 0.83, -1.0);
  const arm1 = box(0.035, 0.9, 0.035, 0, metal);
  arm1.position.set(-1.45, 1.25, -1.0);
  arm1.rotation.z = -0.35;
  const arm2 = box(0.035, 0.75, 0.035, 0, metal);
  arm2.position.set(-1.15, 1.72, -0.75);
  arm2.rotation.set(0.7, 0, -1.1);
  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 24), black);
  capsule.position.set(-0.88, 1.62, -0.5);
  capsule.rotation.set(0.4, 0, 0.3);
  const grille = new THREE.Mesh(new THREE.SphereGeometry(0.078, 24, 16), metal);
  grille.position.set(-0.86, 1.76, -0.46);
  mic.add(clamp, arm1, arm2, capsule, grille);
  scene.add(mic);

  // Panneau ON AIR
  const air = canvasTexture(512, 180);
  const onAirMat = new THREE.MeshBasicMaterial({ map: air.tex, transparent: true, toneMapped: false });
  const onAir = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.28), onAirMat);
  onAir.position.set(1.45, 2.66, -1.58);
  scene.add(onAir);
  const airLight = new THREE.PointLight(RED, 0, 3, 2);
  airLight.position.set(1.45, 2.66, -1.2);
  scene.add(airLight);

  // Fenêtre sur la ville
  const city = canvasTexture(1024, 640);
  drawCity(city.ctx, 1024, 640);
  city.tex.needsUpdate = true;
  const win = new THREE.Group();
  const view = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), new THREE.MeshBasicMaterial({ map: city.tex, toneMapped: false, color: "#9a8fb0" }));
  win.add(view);
  for (const [w, h, x, y] of [[2.0, 0.06, 0, 0.63], [2.0, 0.06, 0, -0.63], [0.06, 1.3, -0.98, 0], [0.06, 1.3, 0.98, 0], [0.04, 1.2, 0, 0]]) {
    const bar = box(w, h, 0.05, 0, black);
    bar.position.set(x, y, 0.02);
    win.add(bar);
  }
  win.position.set(3.3, 2.9, -1.58);
  scene.add(win);

  scene.add(new THREE.HemisphereLight("#3b3060", "#050507", 0.55));

  // Bulles d'alerte qui montent au-dessus du bureau
  const bubbles = [];
  function bubble(text, color) {
    const c = canvasTexture(640, 120);
    c.ctx.font = `800 46px ${FONT}`;
    const w = Math.min(620, c.ctx.measureText(text).width + 70);
    rr(c.ctx, (640 - w) / 2, 10, w, 100, 50);
    c.ctx.fillStyle = "rgba(12,10,20,0.88)";
    c.ctx.fill();
    c.ctx.lineWidth = 6;
    c.ctx.strokeStyle = color;
    c.ctx.stroke();
    c.ctx.fillStyle = TEXT;
    c.ctx.textAlign = "center";
    c.ctx.fillText(text, 320, 76);
    c.tex.needsUpdate = true;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: c.tex, transparent: true, toneMapped: false, depthWrite: false }));
    sprite.scale.set(1.6, 0.3, 1);
    sprite.position.set(0.1, 1.95, -0.4);
    scene.add(sprite);
    bubbles.push({ sprite, born: clockT(), tex: c.tex });
  }

  // Rendu (avec ou sans lumière diffuse)
  let composer = null;
  if (!weak) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.85, 0.55, 0.88)); // seules les LED et le ON AIR rayonnent, le texte des écrans reste net
    composer.addPass(new OutputPass());
  }

  function layout() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    const wide = w / h > 1.2;
    // Grand écran : la pièce se décale à droite pour laisser le texte à gauche.
    if (wide && !compact) camera.setViewOffset(w, h, -w * 0.18, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  layout();
  new ResizeObserver(layout).observe(container);

  const base = new THREE.Vector3(compact ? 0.2 : 0.35, compact ? 1.75 : 1.85, compact ? 4.3 : 4.6);
  const look = new THREE.Vector3(0.25, 1.3, -0.7);
  let mx = 0, my = 0;
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  // Appuis sur la tablette 3D
  const ray = new THREE.Raycaster();
  let tileHandler = () => {};
  renderer.domElement.addEventListener("click", (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camera);
    const hit = ray.intersectObject(tabScreen)[0];
    if (!hit?.uv) return;
    const x = hit.uv.x * 900, y = (1 - hit.uv.y) * 600;
    const tile = deckLayout(900, 600).find((k) => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
    if (tile) tileHandler(tile.name);
  });

  const timer = new THREE.Clock();
  function clockT() {
    return timer.getElapsedTime();
  }

  function applyLed(color) {
    ledMat.emissive.copy(color);
    kbGlow.material.emissive.copy(color);
    for (const l of washes) l.color.copy(color);
    under.color.copy(color);
  }

  let visible = true, last = -1;
  let chatTimer = 0, chatIndex = 6;
  function frame() {
    const t = clockT();
    // LED : respiration lente, ou motif de flash pendant une alerte
    let color = state.power ? state.ledColor : new THREE.Color("#000"), k = (reduce ? 1 : 0.88 + Math.sin(t * 1.4) * 0.12) * (state.power ? state.bright : 0);
    if (state.flash) {
      const age = t - state.flash.at;
      if (age > state.flash.dur) state.flash = null;
      else {
        const on = reduce ? true : Math.floor(age * state.flash.rate) % 2 === 0;
        color = on ? state.flash.color : state.flash.alt;
        k = on ? 1.5 : 0.5; // un flash se voit même LED éteintes, puis la bande revient comme avant
      }
    }
    applyLed(color);
    ledMat.emissiveIntensity = 3.2 * k;
    for (const l of washes) l.intensity = 9 * k;

    if (!reduce && t - chatTimer > 2.4) {
      chatTimer = t;
      state.chat.push(CHAT[chatIndex++ % CHAT.length]);
      if (state.chat.length > 14) state.chat.shift();
    }
    drawMonitor(mon.ctx, 1280, 720, state, t);
    mon.tex.needsUpdate = true;
    drawDeck(tab.ctx, 900, 600, state, t);
    tab.tex.needsUpdate = true;

    for (const b of bubbles.slice()) {
      const age = t - b.born;
      b.sprite.position.y = 1.95 + age * 0.22;
      b.sprite.material.opacity = Math.max(0, 1 - age / 3.2);
      if (age > 3.2) {
        scene.remove(b.sprite);
        b.tex.dispose();
        b.sprite.material.dispose();
        bubbles.splice(bubbles.indexOf(b), 1);
      }
    }

    const drift = reduce ? 0 : Math.sin(t * 0.15) * 0.12;
    camera.position.set(base.x + mx * 0.35 + drift, base.y - my * 0.18, base.z);
    camera.lookAt(look);
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function loop() {
    if (!visible || document.hidden) return;
    requestAnimationFrame(loop);
    const t = clockT();
    if (t - last < 1 / 45) return; // 45 images/s suffisent : la machine sert d'abord au jeu
    last = t;
    frame();
  }
  function wake() {
    if (reduce) frame();
    else loop();
  }
  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !was) wake();
  }).observe(container);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) wake(); });

  drawOnAir(air.ctx, 512, 180, false);
  air.tex.needsUpdate = true;
  document.fonts.ready.then(() => {
    drawOnAir(air.ctx, 512, 180, state.rec || state.live);
    air.tex.needsUpdate = true;
    wake();
  });
  container.dataset.ready = "1";

  function refreshOnAir() {
    const on = state.rec || state.live;
    drawOnAir(air.ctx, 512, 180, on);
    air.tex.needsUpdate = true;
    airLight.intensity = on ? 4 : 0;
  }

  const api = {
    setLed(hex) {
      state.led = hex;
      state.ledColor = new THREE.Color(hex);
      if (reduce) frame();
    },
    sub(user = "Yassine", { lights = true } = {}) {
      const t = clockT();
      state.alert = { kind: "sub", title: "Nouveau sub !", line: `${user} — Tier 1`, at: t };
      if (lights) state.flash = { at: t, dur: 2.4, rate: 5, color: new THREE.Color("#c06bff"), alt: new THREE.Color("#3a0d6b") };
      state.chat.push([user, "#ff7a45", "je viens de m'abonner !"]);
      bubble(`${user} s'abonne`, state.led);
      if (reduce) frame();
    },
    raid(from = "GrosStreamer", viewers = 42, { lights = true } = {}) {
      const t = clockT();
      state.alert = { kind: "raid", title: `Raid de ${from}`, line: `${viewers} viewers arrivent`, at: t };
      if (lights) state.flash = { at: t, dur: 3, rate: 6, color: new THREE.Color(RED), alt: state.ledColor.clone() };
      state.chat.push([from, "#ff5a68", "RAID ! on débarque"]);
      bubble(`Raid ×${viewers}`, RED);
      if (reduce) frame();
    },
    alertOnly(title, line, chat) {
      state.alert = { kind: "info", title, line, at: clockT() };
      if (chat) state.chat.push(chat);
      if (reduce) frame();
    },
    flash(hex) {
      const t = clockT();
      state.flash = { at: t, dur: 1.8, rate: 5, color: new THREE.Color(hex), alt: new THREE.Color("#000") };
    },
    chat(user, color, text) {
      state.chat.push([user, color, text]);
      if (state.chat.length > 14) state.chat.shift();
      if (reduce) frame();
    },
    setPower(on) {
      state.power = on;
      if (reduce) frame();
    },
    setBrightness(pct) {
      state.bright = Math.max(0.05, Math.min(1, pct / 100));
      if (reduce) frame();
    },
    setRec(on) {
      state.rec = on;
      if (on) state.recSince = clockT();
      refreshOnAir();
      if (reduce) frame();
    },
    setLive(on) {
      state.live = on;
      refreshOnAir();
      if (reduce) frame();
    },
    setScene(name) {
      state.scene = name;
      if (reduce) frame();
    },
    press(name) {
      state.lastTile = name;
      state.lastTileAt = clockT();
    },
    onTile(fn) {
      tileHandler = fn;
    },
  };
  return api;
}
