// © 2026 Mikatox TV. Tous droits réservés.
// Guide animé : chaque étape affiche un écran (illustration), le curseur va au bon endroit et « clique ».
import { savedAccent, setAccent } from "./common.js";

setAccent(savedAccent());

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const show = (r, k) => (r.querySelector(`[data-k="${k}"]`).hidden = false);
const hide = (r, k) => (r.querySelector(`[data-k="${k}"]`).hidden = true);
const on = (r, k) => r.querySelector(`[data-k="${k}"]`).classList.add("is-on");
const text = (r, k, v) => (r.querySelector(`[data-k="${k}"]`).textContent = v);

const CHAPTERS = {
  obs: [
    { tpl: "t-obs", target: "outils", title: "Ouvre le menu Outils", text: "Dans OBS, clique « Outils » dans la barre du haut.", after: (r) => show(r, "menu") },
    { tpl: "t-obs", target: "ws", title: "Paramètres du serveur WebSocket", text: "Choisis « Paramètres du serveur WebSocket ». C'est intégré à OBS depuis la version 28." },
    { tpl: "t-obsdlg", target: "enable", title: "Active le serveur", text: "Coche « Activer le serveur WebSocket ». Laisse le port sur 4455.", after: (r) => on(r, "enable") },
    { tpl: "t-obsdlg", target: "auth", title: "Active l'authentification", text: "Coche « Activer l'authentification ». S'il n'y a pas de mot de passe, clique « Générer le mot de passe », puis « Appliquer ».", after: (r) => on(r, "auth") },
    { tpl: "t-obsdlg", target: "info", title: "Affiche les informations", text: "Clique « Afficher les informations de connexion »." },
    { tpl: "t-obsinfo", target: "copy", title: "Copie le mot de passe", text: "Clique « Copier » à côté du mot de passe.", after: (r) => show(r, "copied") },
    { tpl: "t-hubobs", target: "pwd", title: "Colle-le dans Stream Hub", text: "Dans l'app : OBS & santé → OBS. Adresse 127.0.0.1, port 4455, colle le mot de passe.", after: (r) => text(r, "pwd", "••••••••••") },
    { tpl: "t-hubobs", target: "connect", title: "Se connecter", text: "Clique « Se connecter » : la pastille passe au vert. L'app s'en souviendra, et se reconnecte seule si OBS redémarre.", after: (r) => { text(r, "pill", "connecté"); on(r, "pill"); } },
  ],
  twitch: [
    { tpl: "t-hublogin", target: "noid", title: "Pas encore de Client ID ?", text: "Sur l'écran d'accueil de l'app, clique « Je n'ai pas de Client ID ». (Si l'app affiche seulement « Se connecter avec Twitch », ta version en a déjà un : saute à la dernière étape.)", after: (r) => show(r, "console") },
    { tpl: "t-hublogin", target: "console", title: "Ouvre la console Twitch", text: "Clique « Ouvrir la console Twitch Developers » : elle s'ouvre dans ton navigateur. Connecte-toi, puis « Enregistrer votre application »." },
    { tpl: "t-twform", target: "public", title: "Remplis le formulaire", text: "Nom : Mikatox Stream Hub (ajoute ton pseudo s'il est pris). URL : http://localhost puis « Ajouter ». Catégorie : Application Integration. Type de client : Public (important).", after: (r) => on(r, "public") },
    { tpl: "t-twform", target: "create", title: "Créer", text: "Clique « Créer »." },
    { tpl: "t-twapp", target: "copy", title: "Copie l'ID client", text: "Dans « Gérer », copie l'ID client. Ce n'est pas un secret : pas besoin de « Nouveau secret ».", after: (r) => show(r, "copied") },
    { tpl: "t-hublogin", target: "cid", title: "Colle-le dans l'app", text: "Colle l'ID dans « Client ID Twitch ».", after: (r) => { text(r, "cid", "h7x2k9q4m1p8w3z5r6t0"); hide(r, "noid"); } },
    { tpl: "t-hublogin", target: "login", title: "Connecte-toi", text: "Clique « Se connecter avec Twitch ». Une fenêtre Twitch s'ouvre : vérifie que le code est le même, puis « Autoriser ». Le chat et les alertes arrivent.", after: (r) => show(r, "code") },
  ],
  tablet: [
    { tpl: "t-hubdeck", target: "qr", title: "Scanne le QR code", text: "Dans l'app, onglet Deck : scanne le QR code avec la tablette, l'iPad ou le téléphone (même Wi-Fi que le PC)." },
    { tpl: "t-phone", target: "web", title: "Ouvre le deck", text: "Choisis « Ouvrir le deck dans le navigateur » : rien à installer. (Ou l'application Android, plus complète.)", after: (r) => { hide(r, "land"); show(r, "pair"); } },
    { tpl: "t-phone", target: "pin", title: "Saisis le code", text: "Tape le code d'appairage affiché dans l'onglet Deck. Une seule fois : ensuite l'appareil se reconnecte seul.", setup: (r) => { hide(r, "land"); show(r, "pair"); }, after: (r) => text(r, "pin", "482 913") },
    { tpl: "t-phone", target: "ok", title: "Appairer", text: "Touche « Appairer » : tes boutons apparaissent. Ajoute la page à l'écran d'accueil pour l'avoir comme une app.", setup: (r) => { hide(r, "land"); show(r, "pair"); text(r, "pin", "482 913"); }, after: (r) => { hide(r, "pair"); show(r, "deck"); } },
  ],
};

const stage = document.getElementById("stage");
const screen = document.getElementById("screen");
const cursor = document.getElementById("cursor");
const list = document.getElementById("steplist");
const caption = document.getElementById("caption");
let chapter = "obs", index = 0, run = 0;

function render() {
  const steps = CHAPTERS[chapter];
  const step = steps[index];
  const token = ++run;
  // L'écran de l'étape, avec ce que les étapes précédentes du même écran ont déjà fait.
  let first = index;
  while (first > 0 && steps[first - 1].tpl === step.tpl) first--;
  screen.replaceChildren(document.getElementById(step.tpl).content.cloneNode(true));
  for (let k = first; k < index; k++) {
    steps[k].setup?.(screen);
    steps[k].after?.(screen);
  }
  step.setup?.(screen);

  list.querySelectorAll("li").forEach((li, i) => {
    li.classList.toggle("now", i === index);
    li.classList.toggle("done", i < index);
    li.querySelector("button").setAttribute("aria-current", i === index ? "step" : "false");
  });
  caption.textContent = `Étape ${index + 1} sur ${steps.length} — ${step.text}`;
  document.getElementById("prev").disabled = index === 0;
  document.getElementById("next").textContent = index === steps.length - 1 ? (chapter === "tablet" ? "Recommencer" : "Partie suivante") : "Suivant";

  const target = screen.querySelector(`[data-k="${step.target}"]`);
  screen.querySelectorAll(".is-target").forEach((n) => n.classList.remove("is-target"));
  target.classList.add("is-target");
  const s = stage.getBoundingClientRect(), t = target.getBoundingClientRect();
  const x = t.left - s.left + Math.min(t.width * 0.5, 60), y = t.top - s.top + t.height * 0.55;
  cursor.classList.remove("click");
  cursor.style.transitionDuration = reduce ? "0s" : "";
  cursor.style.transform = `translate(${x}px, ${y}px)`;
  setTimeout(() => {
    if (token !== run) return;
    cursor.classList.add("click");
    target.classList.add("is-pressed");
    setTimeout(() => {
      if (token !== run) return;
      target.classList.remove("is-pressed");
      step.after?.(screen);
    }, reduce ? 0 : 260);
  }, reduce ? 0 : 820);
}

function buildList() {
  list.replaceChildren(
    ...CHAPTERS[chapter].map((st, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.innerHTML = `<span>${i + 1}</span>`;
      b.append(document.createTextNode(st.title));
      b.addEventListener("click", () => {
        index = i;
        render();
      });
      li.append(b);
      return li;
    }),
  );
}

function setChapter(name, at = 0) {
  chapter = name;
  index = at;
  document.querySelectorAll(".chapters [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.ch === name)));
  buildList();
  render();
}

document.querySelector(".chapters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ch]");
  if (b) setChapter(b.dataset.ch);
});
document.getElementById("prev").addEventListener("click", () => {
  if (index > 0) {
    index--;
    render();
  }
});
document.getElementById("replay").addEventListener("click", render);
const ORDER = ["obs", "twitch", "tablet"];
document.getElementById("next").addEventListener("click", () => {
  if (index < CHAPTERS[chapter].length - 1) {
    index++;
    render();
  } else setChapter(ORDER[(ORDER.indexOf(chapter) + 1) % ORDER.length]);
});
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === "ArrowRight") document.getElementById("next").click();
  if (e.key === "ArrowLeft") document.getElementById("prev").click();
});
window.addEventListener("resize", () => render());

const hash = location.hash.replace("#", "");
document.fonts.ready.then(() => setChapter(CHAPTERS[hash] ? hash : "obs"));
