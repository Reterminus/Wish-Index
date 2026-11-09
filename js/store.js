import { CARD_BY_ID } from "./cards-data.js";

const PREF_KEY = "wish-index-prefs";
const DECK_KEY = "wish-index-deck";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return { dark: false, textLang: "en", imageLang: "en" };
    return { dark: false, textLang: "en", imageLang: "en", ...JSON.parse(raw) };
  } catch {
    return { dark: false, textLang: "en", imageLang: "en" };
  }
}

function loadDeck() {
  try {
    const raw = localStorage.getItem(DECK_KEY);
    if (!raw) return { deckName: "New Deck", deck: [] };
    const parsed = JSON.parse(raw);
    return { deckName: parsed.deckName || "New Deck", deck: parsed.deck || [] };
  } catch {
    return { deckName: "New Deck", deck: [] };
  }
}

function zoneFor(type) {
  if (type === "TOKEN") return null;
  if (type === "SIGNI" || type === "SPELL") return "main";
  if (["LRIG", "ASSIST LRIG", "ARTS", "PIECE", "RESONA"].includes(type)) return "lrig";
  return "main";
}

const prefs = loadPrefs();
const deckState = loadDeck();

export const state = {
  dark: prefs.dark,
  textLang: prefs.textLang,
  imageLang: prefs.imageLang,
  view: "database",
  query: "",
  types: [],
  colors: [],
  colorMode: "contains",
  level: "",
  powerMin: "",
  powerMax: "",
  classQuery: "",
  setQuery: "",
  lifeBurst: "all",
  deckName: deckState.deckName,
  deck: deckState.deck,
  openId: null,
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify() {
  listeners.forEach((fn) => fn(state));
}

export function setState(partial) {
  Object.assign(state, partial);
  localStorage.setItem(
    PREF_KEY,
    JSON.stringify({ dark: state.dark, textLang: state.textLang, imageLang: state.imageLang }),
  );
  localStorage.setItem(DECK_KEY, JSON.stringify({ deckName: state.deckName, deck: state.deck }));
  document.documentElement.classList.toggle("dark", state.dark);
  notify();
}

export function applyTheme() {
  document.documentElement.classList.toggle("dark", state.dark);
}

export function toggleType(type) {
  const types = state.types.includes(type)
    ? state.types.filter((t) => t !== type)
    : [...state.types, type];
  setState({ types });
}

export function toggleColor(color) {
  const colors = state.colors.includes(color)
    ? state.colors.filter((c) => c !== color)
    : [...state.colors, color];
  setState({ colors });
}

export function openCard(id) {
  setState({ openId: id });
}

export function addToDeck(id) {
  const card = CARD_BY_ID[id];
  if (!card) return { ok: false, message: "Unknown card." };
  const zone = zoneFor(card.type);
  if (!zone) return { ok: false, message: "Tokens cannot be added to a deck." };

  const deck = state.deck;
  const existing = deck.find((e) => e.id === id);
  const cap = zone === "lrig" ? 1 : 4;
  const count = existing?.count ?? 0;
  if (count >= cap) {
    return {
      ok: false,
      message: zone === "lrig" ? "Only 1 copy in the LRIG deck." : "Max 4 copies in the main deck.",
    };
  }

  if (zone === "lrig") {
    const lrigCount = deck.filter((e) => e.zone === "lrig").reduce((n, e) => n + e.count, 0);
    const lv0 = deck.filter((e) => {
      const c = CARD_BY_ID[e.id];
      return c?.type === "LRIG" && c.level === 0;
    }).length;
    const limit = lv0 >= 3 ? 12 : 10;
    if (lrigCount >= limit) return { ok: false, message: `LRIG deck is full (${limit}).` };
  }

  if (card.lifeBurst) {
    const lb = deck
      .filter((e) => e.zone === "main" && CARD_BY_ID[e.id]?.lifeBurst)
      .reduce((n, e) => n + e.count, 0);
    if (lb >= 20) return { ok: false, message: "Life Burst cap is 20." };
  }

  const next = existing
    ? deck.map((e) => (e.id === id ? { ...e, count: e.count + 1 } : e))
    : [...deck, { id, count: 1, zone }];
  setState({ deck: next });
  return { ok: true };
}

export function removeFromDeck(id) {
  const next = state.deck
    .map((e) => (e.id === id ? { ...e, count: e.count - 1 } : e))
    .filter((e) => e.count > 0);
  setState({ deck: next });
}

export function clearDeck() {
  setState({ deck: [] });
}
