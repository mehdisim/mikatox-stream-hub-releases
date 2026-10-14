// © 2026 Mikatox TV. Tous droits réservés.
// Accueil : la télécommande de démonstration pilote la chambre 3D (et la couleur d'accent du site).
import { createRoom } from "./room.js";
import { clock, savedAccent, setAccent, wireSwatches } from "./common.js";

const room = createRoom(document.getElementById("room"));
const status = document.getElementById("status");
const confirmBox = document.getElementById("confirm");
const recBtn = document.querySelector('[data-act="rec"]');
const recTime = recBtn.querySelector(".rec-time");
let recSince = 0, recTimer = 0;

function say(text) {
  status.textContent = text;
}

const led = savedAccent();
setAccent(led);
room?.setLed(led);
const syncSwatches = wireSwatches(document.querySelector(".swatches"), (hex) => {
  setAccent(hex);
  room?.setLed(hex);
  say("Couleur des LED changée : la pièce et le site suivent.");
});
syncSwatches(led);

function sub() {
  room?.sub("Yassine");
  room?.press("SUB");
  say("Nouveau sub de Yassine : flash des LED, alerte à l'écran, message dans le chat.");
}

function raid() {
  room?.raid("GrosStreamer", 42);
  room?.press("RAID");
  say("Raid de GrosStreamer avec 42 viewers : les LED passent au rouge.");
}

function startRec() {
  recSince = performance.now();
  recBtn.setAttribute("aria-pressed", "true");
  room?.setRec(true);
  room?.press("REC");
  recTimer = setInterval(() => (recTime.textContent = clock((performance.now() - recSince) / 1000)), 500);
  recTime.textContent = "00:00:00";
  say("Enregistrement lancé : le panneau ON AIR s'allume.");
}

function stopRec() {
  clearInterval(recTimer);
  recBtn.setAttribute("aria-pressed", "false");
  recTime.textContent = "prêt";
  room?.setRec(false);
  say("Enregistrement arrêté.");
}

// Comme dans l'app : arrêter l'enregistrement demande toujours une confirmation.
function toggleRec() {
  if (recBtn.getAttribute("aria-pressed") !== "true") return startRec();
  confirmBox.hidden = false;
  confirmBox.querySelector(".yes").focus();
  say("Arrêter l'enregistrement ? Comme dans l'app, il faut confirmer.");
}

confirmBox.addEventListener("click", (e) => {
  const b = e.target.closest("[data-confirm]");
  if (!b) return;
  confirmBox.hidden = true;
  if (b.dataset.confirm === "yes") stopRec();
  else say("L'enregistrement continue.");
  recBtn.focus();
});

document.querySelector(".deckstrip").addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "sub") sub();
  else if (act === "raid") raid();
  else if (act === "rec") toggleRec();
});

// La tablette 3D est cliquable elle aussi.
room?.onTile((name) => {
  if (name === "SUB") sub();
  else if (name === "RAID") raid();
  else if (name === "REC") toggleRec();
  else if (name === "BRB" || name === "GAMEPLAY") {
    room.setScene(name === "BRB" ? "BRB" : "Gameplay");
    room.press(name);
    say(`Scène « ${name === "BRB" ? "BRB" : "Gameplay"} » affichée dans OBS.`);
  } else {
    room.press(name);
    say(`« ${name} » : dans l'app, ce bouton pilote OBS. Essaie-le dans la démo complète.`);
  }
});


// « Regarde-la tourner » : un petit film de l'app qui avance tout seul (sub → alerte OBS → tablette → lumières).
// Les étapes sont cliquables ; avec « moins d'animations », le film ne défile plus tout seul.
const film = document.getElementById("film");
if (film) {
  const steps = [...document.querySelectorAll(".film-steps [data-scene]")];
  const filmClock = document.getElementById("film-clock");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let scene = 0, auto = 0, live = 5020;
  const show = (n) => {
    scene = n;
    film.dataset.scene = String(n);
    steps.forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.scene) === n)));
  };
  const play = () => {
    clearInterval(auto);
    if (!still) auto = setInterval(() => show((scene + 1) % steps.length), 3600);
  };
  steps.forEach((b) => b.addEventListener("click", () => {
    show(Number(b.dataset.scene));
    play();
  }));
  setInterval(() => (filmClock.textContent = clock(++live)), 1000);
  show(0);
  play();
}
