// © 2026 Mikatox TV. Tous droits réservés.
// Démo : une réplique de Stream Hub (données fictives) reliée à la chambre 3D. Rien n'est envoyé nulle part.
import { createRoom } from "./room.js";
import { clock, savedAccent, setAccent, wireSwatches } from "./common.js";

const $ = (s) => document.querySelector(s);
const room = createRoom($("#room"), { compact: true });
const rules = { sub: true, raid: true, cmd: true };
let live = false, liveSince = 0, rec = false, recSince = 0, muted = false;

// --- Bulle de confirmation et messages ---
let toastTimer = 0;
function toast(text) {
  const t = $("#dtoast");
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), 3200);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

// --- Onglets ---
const tabs = [...document.querySelectorAll('.apprail [role="tab"]')];
function selectTab(tab) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute("aria-selected", String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  }
}
tabs.forEach((t) => t.addEventListener("click", () => selectTab(t)));
$(".apprail").addEventListener("keydown", (e) => {
  const i = tabs.indexOf(document.activeElement);
  if (i < 0 || !["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(e.key)) return;
  e.preventDefault();
  const next = tabs[(i + (e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
  next.focus();
  selectTab(next);
});
selectTab(tabs[0]);

// --- Couleur ---
const led = savedAccent();
setAccent(led);
room?.setLed(led);
const syncSw = wireSwatches($("#p-lights .swatches"), (hex) => {
  setAccent(hex);
  room?.setLed(hex);
  toast("Couleur envoyée à la bande LED.");
});
syncSw(led);

$("#power").addEventListener("change", (e) => {
  room?.setPower(e.target.checked);
  toast(e.target.checked ? "LED allumées." : "LED éteintes.");
});
$("#bright").addEventListener("input", (e) => {
  $("#brightv").textContent = `${e.target.value} %`;
  room?.setBrightness(Number(e.target.value));
});
$("#flashbtn").addEventListener("click", () => {
  room?.flash(document.documentElement.dataset.led || "#e4901e");
  toast("Flash des LED, puis retour à la couleur d'avant.");
});

// --- Chat ---
const NAMES = [["Nora", "#3ddc84"], ["Kenzo", "#7aa7ff"], ["Lina", "#ff8bd1"], ["Sami", "#ffd166"], ["Inès", "#5ce1e6"], ["Adam", "#ff9a8b"]];
const LINES = ["salut tout le monde", "le son est nickel", "GG", "on fait quoi après ?", "trop beau l'overlay", "première fois ici", "go ranked !"];
function chatLine(user, color, text, me = false) {
  const box = $("#chatbox");
  const line = el("div", "cl" + (me ? " me" : ""));
  const name = el("b", null, user);
  name.style.color = color;
  line.append(name, document.createTextNode(" " + text));
  box.append(line);
  while (box.children.length > 60) box.firstChild.remove();
  box.scrollTop = box.scrollHeight;
  room?.chat(user, color, text);
}
let n = 0;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function ambientChat() {
  const [u, c] = NAMES[n % NAMES.length];
  chatLine(u, c, LINES[(n * 3) % LINES.length]);
  n++;
}
for (let i = 0; i < 5; i++) ambientChat();
if (!reduce) setInterval(() => !document.hidden && ambientChat(), 3500);

$("#chatform").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("#chatin").value.trim();
  if (!v) return;
  chatLine("Mikatox TV", "#d9b3ff", v, true);
  $("#chatin").value = "";
  if (v.toLowerCase().startsWith("!discord")) {
    if (rules.cmd) {
      setTimeout(() => chatLine("StreamHub", "#e4901e", "Rejoins le Discord : discord.gg/A5sdHYPCWE"), 500);
      logRule("Commande !discord → lien envoyé dans le chat");
    } else logRule("Commande !discord reçue, règle désactivée : rien ne se passe", true);
  }
});

// --- Alertes et automatisations ---
function logAlert(text) {
  const li = el("li", null, text);
  $("#alertlog").prepend(li);
  while ($("#alertlog").children.length > 5) $("#alertlog").lastChild.remove();
}
function logRule(text, off = false) {
  const li = el("li", off ? "off" : null, text);
  $("#runlog").prepend(li);
  while ($("#runlog").children.length > 6) $("#runlog").lastChild.remove();
}
const SIMS = {
  follow() {
    logAlert("Rayan — nouveau follow");
    room?.alertOnly("Nouveau follow", "Rayan te suit", ["Rayan", "#c9b3ff", "je follow !"]);
  },
  sub() {
    logAlert("Yassine — sub · Tier 1");
    room?.sub("Yassine", { lights: rules.sub });
    logRule(rules.sub ? "Nouveau sub → flash orange des LED + alerte" : "Nouveau sub reçu, règle désactivée : LED inchangées", !rules.sub);
  },
  bits() {
    logAlert("Yassine — bits ×500");
    room?.alertOnly("500 bits !", "Merci Yassine", ["Yassine", "#ff7a45", "cheer500 gg la team"]);
  },
  raid() {
    logAlert("GrosStreamer — raid ×42");
    room?.raid("GrosStreamer", 42, { lights: rules.raid });
    if (rules.raid) setTimeout(() => chatLine("StreamHub", "#e4901e", "Bienvenue aux 42 viewers de GrosStreamer !"), 600);
    logRule(rules.raid ? "Raid → LED rouges + message de bienvenue" : "Raid reçu, règle désactivée : rien ne se passe", !rules.raid);
  },
};
$(".simrow").addEventListener("click", (e) => {
  const k = e.target.closest("[data-sim]")?.dataset.sim;
  if (k) SIMS[k]();
});
document.querySelectorAll("[data-rule]").forEach((cb) =>
  cb.addEventListener("change", () => {
    rules[cb.dataset.rule] = cb.checked;
    logRule(`Règle « ${cb.parentElement.querySelector("b").textContent} » ${cb.checked ? "activée" : "désactivée"}`, !cb.checked);
  }),
);

// --- Mixeur ---
const CHANS = [["Micro", 90], ["Jeu", 70], ["Musique", 45], ["Alertes", 80]];
const meters = [];
for (const [name, vol] of CHANS) {
  const row = el("div", "ch");
  const label = el("span", "nm", name);
  const input = document.createElement("input");
  Object.assign(input, { type: "range", min: 0, max: 100, value: vol });
  input.setAttribute("aria-label", `Volume ${name}`);
  const out = el("output", "pc", `${vol} %`);
  const meter = el("span", "vu");
  const bar = el("i");
  meter.append(bar);
  const mute = el("button", "mu", "ON");
  mute.setAttribute("aria-pressed", "false");
  mute.setAttribute("aria-label", `Couper ${name}`);
  input.addEventListener("input", () => (out.textContent = `${input.value} %`));
  mute.addEventListener("click", () => {
    const off = mute.getAttribute("aria-pressed") !== "true";
    mute.setAttribute("aria-pressed", String(off));
    mute.textContent = off ? "COUPÉ" : "ON";
    if (name === "Micro") setMic(off, false);
  });
  row.append(label, input, out, mute, meter);
  $("#mixer").append(row);
  meters.push({ name, input, mute, bar });
}
function vu() {
  const t = performance.now() / 1000;
  meters.forEach((m, i) => {
    const off = m.mute.getAttribute("aria-pressed") === "true";
    const level = off ? 0 : (Number(m.input.value) / 100) * (0.45 + Math.abs(Math.sin(t * (2.2 + i) + i)) * 0.55);
    m.bar.style.transform = `scaleX(${level.toFixed(3)})`;
    m.bar.classList.toggle("hot", level > 0.82);
  });
  if (!reduce) requestAnimationFrame(vu);
}
vu();

// --- Deck et OBS ---
const recChip = $("#recchip"), liveChip = $("#livechip");
setInterval(() => {
  if (rec) recChip.textContent = `REC ${clock((performance.now() - recSince) / 1000)}`;
  if (live) liveChip.textContent = `LIVE ${clock((performance.now() - liveSince) / 1000)}`;
}, 500);

function tile(name) {
  return document.querySelector(`[data-tile="${name}"]`);
}
function setScene(name) {
  room?.setScene(name);
  document.querySelectorAll("#scenes [data-scene]").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.scene === name)));
  tile("GAMEPLAY").setAttribute("aria-pressed", String(name === "Gameplay"));
  tile("BRB").setAttribute("aria-pressed", String(name === "BRB"));
  toast(`Scène « ${name} » affichée dans OBS.`);
}
function setMic(off, fromTile = true) {
  muted = off;
  tile("MICRO").setAttribute("aria-pressed", String(off));
  tile("MICRO").querySelector("small").textContent = off ? "coupé" : "couper";
  if (fromTile) {
    const m = meters.find((x) => x.name === "Micro");
    m.mute.setAttribute("aria-pressed", String(off));
    m.mute.textContent = off ? "COUPÉ" : "ON";
  }
  toast(off ? "Micro coupé dans OBS." : "Micro réactivé.");
}

// Arrêter le live ou l'enregistrement demande toujours une confirmation, comme dans l'app.
let pending = null;
function ask(text, onYes) {
  pending = onYes;
  $("#dconfirm-text").textContent = text;
  $("#dconfirm").hidden = false;
  $("#dconfirm .yes").focus();
}
$("#dconfirm").addEventListener("click", (e) => {
  const b = e.target.closest("[data-confirm]");
  if (!b) return;
  $("#dconfirm").hidden = true;
  if (b.dataset.confirm === "yes" && pending) pending();
  pending = null;
});

function setRec(on) {
  rec = on;
  recSince = performance.now();
  recChip.hidden = !on;
  tile("REC").setAttribute("aria-pressed", String(on));
  tile("REC").querySelector("small").textContent = on ? "en cours" : "enregistrer";
  room?.setRec(on);
  toast(on ? "Enregistrement démarré, confirmé par OBS." : "Enregistrement arrêté.");
}
function setLive(on) {
  live = on;
  liveSince = performance.now();
  liveChip.hidden = !on;
  tile("LIVE").setAttribute("aria-pressed", String(on));
  tile("LIVE").querySelector("small").textContent = on ? "en direct" : "démarrer";
  room?.setLive(on);
  toast(on ? "Live démarré, confirmé par OBS." : "Live arrêté.");
}

let moments = 0;
const ACTIONS = {
  LIVE: () => (live ? ask("Arrêter le live ?", () => setLive(false)) : setLive(true)),
  REC: () => (rec ? ask("Arrêter l'enregistrement ?", () => setRec(false)) : setRec(true)),
  GAMEPLAY: () => setScene("Gameplay"),
  BRB: () => setScene("BRB"),
  MICRO: () => setMic(!muted),
  CLIP: () => {
    toast("Clip Twitch de 30 s créé (démo).");
    room?.alertOnly("Clip créé", "Les 30 dernières secondes");
  },
  MOMENT: () => {
    moments++;
    toast(rec ? `Moment n°${moments} marqué à ${clock((performance.now() - recSince) / 1000)} de l'enregistrement.` : `Moment n°${moments} marqué (lance REC pour l'avoir dans la vidéo).`);
  },
  CHILL: () => {
    setScene("Chill");
    setAccent("#3d7bff");
    room?.setLed("#3d7bff");
    syncSw("#3d7bff");
    toast("Ambiance « Chill » : scène Chill et LED bleues, en un appui.");
  },
};
$("#tiles").addEventListener("click", (e) => {
  const name = e.target.closest("[data-tile]")?.dataset.tile;
  if (!name) return;
  room?.press(name === "MOMENT" || name === "CHILL" ? "CLIP" : name);
  ACTIONS[name]();
});
$("#scenes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-scene]");
  if (b) setScene(b.dataset.scene);
});

// La tablette 3D pilote la même démo.
const FROM_ROOM = { LIVE: "LIVE", REC: "REC", GAMEPLAY: "GAMEPLAY", BRB: "BRB", MICRO: "MICRO", CLIP: "CLIP" };
room?.onTile((name) => {
  room.press(name);
  if (name === "SUB") SIMS.sub();
  else if (name === "RAID") SIMS.raid();
  else if (FROM_ROOM[name]) ACTIONS[FROM_ROOM[name]]();
});
