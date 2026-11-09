import { CARDS, CARD_BY_ID } from "./cards-data.js";
import { COLOR_OPTIONS, TYPE_OPTIONS } from "./icons.js";
import { matches } from "./filter.js";
import { imageList, primaryImage } from "./images.js";
import { renderCardText, renderCostIcons, escapeHtml } from "./card-text.js";
import { exportDeckImage } from "./export-deck.js";
import { fingerprint, fingerprintFromCanvas, distance } from "./art-match.js";
import {
  state,
  setState,
  subscribe,
  applyTheme,
  toggleType,
  toggleColor,
  openCard,
  addToDeck,
  removeFromDeck,
  clearDeck,
} from "./store.js";

const app = document.getElementById("app");
let filterDrawerOpen = false;
let modalArtIndex = 0;
let scanIndex = [];
let scanReady = 0;
let scanStream = null;
let lastExport = null;
let pickQuery = "";
let pickNotice = null;

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function cardName(card) {
  return card.name[state.textLang] || card.name.en || "Not available";
}

function renderFilters(idPrefix) {
  const typeChips = TYPE_OPTIONS.map(
    (t) =>
      `<button type="button" class="chip" data-filter-type="${t}" data-on="${state.types.includes(t)}">${t}</button>`,
  ).join("");
  const colorChips = COLOR_OPTIONS.map(
    (c) =>
      `<button type="button" class="chip chip-color" data-filter-color="${c.id}" data-on="${state.colors.includes(c.id)}" title="${c.id}" aria-label="${c.id}"><img src="${c.icon}" alt="${c.id}" /></button>`,
  ).join("");
  return `
    <div class="space-y" data-filters="${idPrefix}">
      <label class="block">Search
        <input class="field" data-f="query" value="${escapeHtml(state.query)}" placeholder="Name, text, set code…" />
      </label>
      <div>
        <p style="margin:0 0 0.5rem;font-size:0.875rem;font-weight:600">Type</p>
        <div class="chip-row">${typeChips}</div>
      </div>
      <div>
        <p style="margin:0 0 0.5rem;font-size:0.875rem;font-weight:600">Color</p>
        <div class="chip-row" style="margin-bottom:0.5rem">
          <button type="button" class="chip" data-color-mode="contains" data-on="${state.colorMode === "contains"}">Contains any</button>
          <button type="button" class="chip" data-color-mode="exact" data-on="${state.colorMode === "exact"}">Exact mix</button>
        </div>
        <div class="chip-row">${colorChips}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <label class="block">Level<input class="field" data-f="level" inputmode="numeric" value="${escapeHtml(state.level)}" /></label>
        <label class="block">Set code<input class="field" data-f="setQuery" value="${escapeHtml(state.setQuery)}" /></label>
        <label class="block">Power min<input class="field" data-f="powerMin" inputmode="numeric" value="${escapeHtml(state.powerMin)}" /></label>
        <label class="block">Power max<input class="field" data-f="powerMax" inputmode="numeric" value="${escapeHtml(state.powerMax)}" /></label>
      </div>
      <label class="block">Class
        <input class="field" data-f="classQuery" placeholder="Nature Tone: Bacteria" value="${escapeHtml(state.classQuery)}" />
      </label>
      <div>
        <p style="margin:0 0 0.5rem;font-size:0.875rem;font-weight:600">Life Burst</p>
        <div class="chip-row">
          <button type="button" class="chip" data-lb="all" data-on="${state.lifeBurst === "all"}">Include all</button>
          <button type="button" class="chip" data-lb="yes" data-on="${state.lifeBurst === "yes"}">Yes</button>
          <button type="button" class="chip" data-lb="no" data-on="${state.lifeBurst === "no"}">No</button>
        </div>
      </div>
      <button type="button" class="btn-ghost" style="width:100%" data-reset-filters>Reset</button>
    </div>
  `;
}

function bindFilters(root) {
  root.querySelectorAll("[data-f]").forEach((input) => {
    input.addEventListener("input", () => {
      // Update filter state without full re-render (keeps focus while typing)
      const key = input.getAttribute("data-f");
      state[key] = input.value;
      refreshDatabaseResults();
    });
  });
  root.querySelectorAll("[data-filter-type]").forEach((btn) => {
    btn.addEventListener("click", () => toggleType(btn.getAttribute("data-filter-type")));
  });
  root.querySelectorAll("[data-filter-color]").forEach((btn) => {
    btn.addEventListener("click", () => toggleColor(btn.getAttribute("data-filter-color")));
  });
  root.querySelectorAll("[data-color-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setState({ colorMode: btn.getAttribute("data-color-mode") }));
  });
  root.querySelectorAll("[data-lb]").forEach((btn) => {
    btn.addEventListener("click", () => setState({ lifeBurst: btn.getAttribute("data-lb") }));
  });
  root.querySelector("[data-reset-filters]")?.addEventListener("click", () => {
    setState({
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
    });
  });
}

function cardFace(card) {
  const src = primaryImage(card, state.imageLang);
  const name = cardName(card);
  const art = src
    ? `<img src="${src}" alt="${escapeHtml(name)}" />`
    : `<div class="na">Not available</div>`;
  return `
    <button type="button" class="card-frame" data-open="${card.id}">
      <div class="card-art">${art}</div>
      <div class="card-meta">
        <div class="name">${escapeHtml(name)}</div>
        <div class="sub">${escapeHtml(card.type)}${card.level != null ? ` · Lv${card.level}` : ""}${card.colors.length ? ` · ${card.colors.join("/")}` : ""}</div>
      </div>
    </button>
  `;
}


function filteredCards() {
  return CARDS.filter((c) =>
    matches(c, {
      query: state.query,
      types: state.types,
      colors: state.colors,
      colorMode: state.colorMode,
      level: state.level,
      powerMin: state.powerMin,
      powerMax: state.powerMax,
      classQuery: state.classQuery,
      setQuery: state.setQuery,
      lifeBurst: state.lifeBurst,
    }),
  );
}

/** Update only the results grid so filter inputs keep focus while typing. */
function refreshDatabaseResults() {
  const results = filteredCards();
  const count = document.querySelector("[data-results-count]");
  if (count) count.textContent = `${results.length} cards`;
  const grid = document.querySelector("[data-results-grid]");
  if (grid) {
    grid.innerHTML = results.map(cardFace).join("") || "";
    grid.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        modalArtIndex = 0;
        openCard(btn.getAttribute("data-open"));
      });
    });
  }
  const showBtn = document.querySelector("[data-close-filters].btn-pink");
  if (showBtn) showBtn.textContent = `Show ${results.length}`;
}

function renderDatabase() {
  const results = filteredCards();

  return `
    <div class="layout-db">
      <aside class="filters-desktop">
        <div class="surface filters-panel">${renderFilters("desk")}</div>
      </aside>
      <section>
        <div class="results-bar">
          <p style="margin:0;font-size:0.875rem;font-weight:600" data-results-count>${results.length} cards</p>
          <button type="button" class="btn-ghost filters-mobile-btn" data-open-filters>Filters</button>
        </div>
        <div class="card-grid" data-results-grid>
          ${results.map(cardFace).join("") || ""}
        </div>
        ${results.length === 0 ? `<p class="surface" style="padding:1.5rem;font-size:0.875rem" class="muted">No cards match these filters.</p>` : ""}
      </section>
    </div>
    ${
      filterDrawerOpen
        ? `<div class="drawer-backdrop" data-close-filters>
            <div class="surface drawer" data-stop>
              ${renderFilters("mobile")}
              <button type="button" class="btn-pink" style="width:100%;margin-top:1rem" data-close-filters>Show ${results.length}</button>
            </div>
          </div>`
        : ""
    }
  `;
}

function deckStats() {
  const main = state.deck.filter((e) => e.zone === "main");
  const lrig = state.deck.filter((e) => e.zone === "lrig");
  const mainTotal = main.reduce((n, e) => n + e.count, 0);
  const lrigTotal = lrig.reduce((n, e) => n + e.count, 0);
  const lb = main.filter((e) => CARD_BY_ID[e.id]?.lifeBurst).reduce((n, e) => n + e.count, 0);
  const lv0 = lrig.filter((e) => {
    const c = CARD_BY_ID[e.id];
    return c?.type === "LRIG" && c.level === 0;
  }).length;
  const lrigCap = lv0 >= 3 ? 12 : 10;
  return { main, lrig, mainTotal, lrigTotal, lb, lrigCap };
}

function renderDeck() {
  const { main, lrig, mainTotal, lrigTotal, lb, lrigCap } = deckStats();
  const notes = [
    lrigTotal !== lrigCap ? `LRIG deck is ${lrigTotal}/${lrigCap}.` : null,
    mainTotal !== 40 ? `Main deck is ${mainTotal}/40.` : null,
    lb > 20 ? "Life Burst is over 20." : null,
  ].filter(Boolean);

  const q = pickQuery.trim().toLowerCase();
  const choices = CARDS.filter((c) => c.type !== "TOKEN").filter((c) => {
    if (!q) return true;
    return (
      c.name.en.toLowerCase().includes(q) ||
      c.name.jp.toLowerCase().includes(q) ||
      c.setcodes.some((code) => code.toLowerCase().includes(q)) ||
      c.type.toLowerCase().includes(q)
    );
  });

  const zone = (title, entries) => `
    <section>
      <h2 class="zone-title">${title}</h2>
      ${
        entries.length === 0
          ? `<p class="muted" style="font-size:0.875rem">Empty.</p>`
          : `<div class="zone-grid">${entries
              .map((entry) => {
                const card = CARD_BY_ID[entry.id];
                if (!card) return "";
                const src = primaryImage(card, state.imageLang);
                return `
                  <div class="surface zone-card">
                    <button type="button" class="card-frame" data-open="${card.id}" style="border:none;box-shadow:none">
                      <div class="card-art">${src ? `<img src="${src}" alt="" />` : `<div class="na">Not available</div>`}</div>
                      <div class="card-meta"><div class="name">${escapeHtml(card.name.en)}</div></div>
                    </button>
                    <div class="counts">
                      <button type="button" class="btn-ghost" data-deck-minus="${card.id}">−</button>
                      <span style="font-weight:700">${entry.count}</span>
                      <button type="button" class="btn-ghost" data-deck-plus="${card.id}">+</button>
                    </div>
                  </div>`;
              })
              .join("")}</div>`
      }
    </section>`;

  return `
    <div class="space-y">
      <div class="surface deck-toolbar">
        <label class="block grow">Deck name
          <input class="field" data-deck-name value="${escapeHtml(state.deckName)}" />
        </label>
        <button type="button" class="btn-pink" data-export ${state.deck.length ? "" : "disabled"}>Export image</button>
        <button type="button" class="btn-ghost" data-clear-deck>Clear</button>
      </div>
      <p class="muted" style="font-size:0.875rem;margin:0">
        Main ${mainTotal} · Life Burst ${lb}/20 · LRIG ${lrigTotal}/${lrigCap}
        ${notes.length ? ` — ${notes.join(" ")}` : ""}
      </p>
      <section class="surface picker">
        <h2 style="margin:0;font-size:1.1rem;font-weight:800">Add cards</h2>
        <input class="field" style="margin-top:0.5rem" data-pick-query value="${escapeHtml(pickQuery)}" placeholder="Search by name, set code, or type" />
        ${pickNotice ? `<p class="warn" style="font-size:0.875rem;margin:0.5rem 0 0">${escapeHtml(pickNotice)}</p>` : ""}
        <div class="picker-grid" data-picker-grid>
          ${choices
            .map((card) => {
              const src = primaryImage(card, state.imageLang);
              return `
                <div class="picker-item">
                  <button type="button" class="card-frame" data-open="${card.id}" style="border:none;box-shadow:none">
                    <div class="card-art">${src ? `<img src="${src}" alt="" />` : `<div class="na">Not available</div>`}</div>
                  </button>
                  <p class="name">${escapeHtml(cardName(card))}</p>
                  <button type="button" class="btn-pink" data-pick-add="${card.id}">Add</button>
                </div>`;
            })
            .join("")}
        </div>
      </section>
      ${zone("Main deck", main)}
      ${zone("LRIG deck", lrig)}
      ${
        lastExport
          ? `<div class="surface" style="padding:0.75rem">
              <p style="margin:0 0 0.5rem;font-size:0.875rem;font-weight:600">Latest export</p>
              <img src="${lastExport}" alt="Deck export" style="max-height:480px;width:100%;object-fit:contain" />
            </div>`
          : ""
      }
    </div>
  `;
}

function renderScan() {
  return `
    <div class="scan-layout">
      <div class="surface" style="padding:0.75rem;overflow:hidden">
        <video id="scan-video" class="scan-video" playsinline muted></video>
        <p id="scan-error" class="warn" style="font-size:0.875rem;margin:0.75rem 0 0;display:none"></p>
        <button type="button" class="btn-pink" style="width:100%;margin-top:0.75rem" id="scan-capture" ${scanReady ? "" : "disabled"}>
          ${scanReady ? "Capture card" : "Indexing art…"}
        </button>
        <p class="muted" style="font-size:0.75rem;margin:0.5rem 0 0">Scan is most effective when the card fills out the edges of the camera.</p>
      </div>
      <div>
        <h2 style="margin:0 0 0.75rem;font-size:1.2rem;font-weight:800">Closest matches</h2>
        <div id="scan-hits" class="space-y">
          <p class="muted" style="font-size:0.875rem">Point the camera at a card and capture. Up to five guesses appear here.</p>
        </div>
      </div>
    </div>
  `;
}

function renderModal() {
  if (!state.openId) return "";
  const card = CARD_BY_ID[state.openId];
  if (!card) return "";
  const arts = imageList(card, state.imageLang);
  const shown = arts[Math.min(modalArtIndex, Math.max(arts.length - 1, 0))] || null;
  const name = cardName(card);
  const text = card.text[state.textLang];
  const missingText = !text || /^not available/i.test(text.trim());
  const related = card.related.map((id) => CARD_BY_ID[id]).filter(Boolean);

  // html: true → value already contains safe icon markup (cost orbs, etc.)
const facts = [
  ["Type", card.type, false],
  ["Color", card.colors?.length ? renderCostIcons(card.colors) : null, true],
  ["Set", card.setcodes?.length ? card.setcodes.join(", ") : null, false],
  ["Level", card.level != null ? String(card.level) : null, false],
  ["Limit", card.limit != null ? String(card.limit) : null, false],
  ["Power", card.power != null ? String(card.power) : null, false],
  ["Class", card.class || null, false],
  ["Team", card.team || null, false],
  ["LRIG Class", card.lrigType || null, false],          // ← use your renamed label here
  ["Use Timing", card.useTiming || null, false],        // ← use your renamed label here
  ["Grow Cost", card.growCost?.length ? renderCostIcons(card.growCost) : null, true],
["Coin", card.coin?.length ? renderCostIcons(card.coin) : null, true],
  ["Cost", card.cost?.length ? renderCostIcons(card.cost) : null, true],
  // Life Burst intentionally omitted from the UI
  ["Illustrator", card.illustrator || null, false],
].filter(([, value]) => value != null && value !== "");

  return `
    <div class="modal-backdrop" data-close-modal>
      <div class="surface modal" data-stop>
        <div class="modal-head">
          <div>
            <p style="margin:0;font-size:0.75rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--cyan-deep)">${escapeHtml(card.type)}</p>
            <h2 style="margin:0.15rem 0 0;font-size:1.5rem;font-weight:800">${escapeHtml(name)}</h2>
          </div>
          <button type="button" class="btn-ghost" style="padding:0.45rem 0.75rem" data-close-modal aria-label="Close">✕</button>
        </div>
        <div class="modal-grid">
          <div>
            <div class="card-art" style="border-radius:0.5rem;overflow:hidden">
              ${shown ? `<img src="${shown}" alt="${escapeHtml(name)}" style="width:100%;display:block" />` : `<div class="na">Not available</div>`}
            </div>
            ${
              arts.length > 1
                ? `<div class="thumb-strip">${arts
                    .map(
                      (src, i) =>
                        `<button type="button" data-art="${i}" data-on="${i === modalArtIndex}"><img src="${src}" alt="" /></button>`,
                    )
                    .join("")}</div>`
                : ""
            }
          </div>
          <div>
            <h3 style="margin:0 0 0.5rem;font-size:0.8rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">Card text</h3>
            <div class="card-text">${missingText ? `<p class="muted">Not available</p>` : renderCardText(text)}</div>
            <dl class="facts">
              ${facts
                .map(
                  ([k, v, html]) =>
                    `<div><dt>${escapeHtml(k)}</dt><dd>${html ? v : escapeHtml(v)}</dd></div>`,
                )
                .join("")}
            </dl>
            ${
              related.length
                ? `<h3 style="margin:1.5rem 0 0.5rem;font-size:0.8rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">Related cards</h3>
                   <div class="related-row">
                     ${related
                       .map((rel) => {
                         const thumb = primaryImage(rel, state.imageLang);
                         return `<button type="button" data-open="${rel.id}" title="${escapeHtml(rel.name.en)}">
                           ${thumb ? `<img src="${thumb}" alt="${escapeHtml(rel.name.en)}" />` : `<div class="na" style="aspect-ratio:63/88;border-radius:0.25rem">Not available</div>`}
                         </button>`;
                       })
                       .join("")}
                   </div>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function render() {
  const wasScan = state.view === "scan";
  app.innerHTML = `
    <div class="app-bg">
      <div class="watermark"></div>
      <div class="wrap">
        <header class="surface header">
          <img class="logo" src="brand/x.png" alt="" />
          <div class="brand">
            <h1 class="title-gradient" aria-label="Wish Index"><span class="title-pink">Wish In</span><span class="title-blue">dex</span></h1>
          </div>
          <nav class="nav">
            <button type="button" class="chip" data-view="database" data-on="${state.view === "database"}">Database</button>
            <button type="button" class="chip" data-view="deck" data-on="${state.view === "deck"}">Deck</button>
            <button type="button" class="chip" data-view="scan" data-on="${state.view === "scan"}">Scan</button>
          </nav>
          <div class="toggles">
            <button type="button" class="chip" data-toggle-lang data-on="${state.textLang === "jp"}" title="Toggle English / Japanese for text and art">${state.textLang.toUpperCase()}</button>
            <button type="button" class="chip" data-toggle-dark aria-label="Toggle dark mode">${state.dark ? "Light" : "Dark"}</button>
          </div>
        </header>
        <main id="main">
          ${state.view === "database" ? renderDatabase() : ""}
          ${state.view === "deck" ? renderDeck() : ""}
          ${state.view === "scan" ? renderScan() : ""}
        </main>
      </div>
      ${renderModal()}
    </div>
  `;

  bindEvents();
  if (wasScan) setupScan();
}

function bindEvents() {
  app.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filterDrawerOpen = false;
      pickNotice = null;
      stopScan();
      setState({ view: btn.getAttribute("data-view") });
    });
  });
  app.querySelector("[data-toggle-lang]")?.addEventListener("click", () => {
    const next = state.textLang === "en" ? "jp" : "en";
    setState({ textLang: next, imageLang: next });
  });
  app.querySelector("[data-toggle-dark]")?.addEventListener("click", () => {
    setState({ dark: !state.dark });
  });

  app.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      modalArtIndex = 0;
      openCard(btn.getAttribute("data-open"));
    });
  });

  app.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => openCard(null));
  });
  app.querySelector("[data-stop]")?.addEventListener("click", (e) => e.stopPropagation());

  app.querySelectorAll("[data-art]").forEach((btn) => {
    btn.addEventListener("click", () => {
      modalArtIndex = Number(btn.getAttribute("data-art"));
      render();
    });
  });

  if (state.view === "database") {
    app.querySelectorAll("[data-filters]").forEach(bindFilters);
    app.querySelector("[data-open-filters]")?.addEventListener("click", () => {
      filterDrawerOpen = true;
      render();
    });
    app.querySelectorAll("[data-close-filters]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (el.hasAttribute("data-stop")) return;
        filterDrawerOpen = false;
        render();
      });
    });
    app.querySelector(".drawer")?.addEventListener("click", (e) => e.stopPropagation());
  }

  if (state.view === "deck") {
    app.querySelector("[data-deck-name]")?.addEventListener("input", (e) => {
      setState({ deckName: e.target.value });
    });
    app.querySelector("[data-clear-deck]")?.addEventListener("click", () => {
      clearDeck();
      lastExport = null;
    });
    app.querySelector("[data-export]")?.addEventListener("click", async () => {
      const btn = app.querySelector("[data-export]");
      btn.disabled = true;
      btn.textContent = "Rendering…";
      try {
        const url = await exportDeckImage(state.deckName, state.deck, state.imageLang);
        lastExport = url;
        const a = document.createElement("a");
        a.href = url;
        a.download = `${state.deckName || "deck"}.png`;
        a.click();
        render();
      } finally {
        /* re-render handles button */
      }
    });
    app.querySelector("[data-pick-query]")?.addEventListener("input", (e) => {
      pickQuery = e.target.value;
      // Soft-refresh picker grid only
      const grid = document.querySelector("[data-picker-grid]");
      if (!grid) {
        render();
        return;
      }
      const q = pickQuery.trim().toLowerCase();
      const choices = CARDS.filter((c) => c.type !== "TOKEN").filter((c) => {
        if (!q) return true;
        return (
          c.name.en.toLowerCase().includes(q) ||
          c.name.jp.toLowerCase().includes(q) ||
          c.setcodes.some((code) => code.toLowerCase().includes(q)) ||
          c.type.toLowerCase().includes(q)
        );
      });
      grid.innerHTML = choices
        .map((card) => {
          const src = primaryImage(card, state.imageLang);
          return `
            <div class="picker-item">
              <button type="button" class="card-frame" data-open="${card.id}" style="border:none;box-shadow:none">
                <div class="card-art">${src ? `<img src="${src}" alt="" />` : `<div class="na">Not available</div>`}</div>
              </button>
              <p class="name">${escapeHtml(cardName(card))}</p>
              <button type="button" class="btn-pink" data-pick-add="${card.id}">Add</button>
            </div>`;
        })
        .join("");
      grid.querySelectorAll("[data-open]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          modalArtIndex = 0;
          openCard(btn.getAttribute("data-open"));
        });
      });
      grid.querySelectorAll("[data-pick-add]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const result = addToDeck(btn.getAttribute("data-pick-add"));
          pickNotice = result.ok ? null : result.message || "Could not add.";
          render();
        });
      });
    });
    app.querySelectorAll("[data-pick-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const result = addToDeck(btn.getAttribute("data-pick-add"));
        pickNotice = result.ok ? null : result.message || "Could not add.";
        render();
      });
    });
    app.querySelectorAll("[data-deck-plus]").forEach((btn) => {
      btn.addEventListener("click", () => addToDeck(btn.getAttribute("data-deck-plus")));
    });
    app.querySelectorAll("[data-deck-minus]").forEach((btn) => {
      btn.addEventListener("click", () => removeFromDeck(btn.getAttribute("data-deck-minus")));
    });
  }
}

async function buildScanIndex() {
  const built = [];
  for (const card of CARDS) {
    const srcs = [...imageList(card, "en"), ...imageList(card, "jp")];
    for (const src of srcs) {
      const vec = await fingerprint(src);
      if (vec) built.push({ id: card.id, src, vec });
      scanReady = built.length;
    }
  }
  scanIndex = built;
}

function stopScan() {
  if (scanStream) {
    scanStream.getTracks().forEach((t) => t.stop());
    scanStream = null;
  }
}

async function setupScan() {
  const video = document.getElementById("scan-video");
  const err = document.getElementById("scan-error");
  const capture = document.getElementById("scan-capture");
  if (!video) return;

  if (!scanIndex.length) {
    await buildScanIndex();
    const c = document.getElementById("scan-capture");
    if (c) {
      c.disabled = false;
      c.textContent = "Capture card";
    }
  }

  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    video.srcObject = scanStream;
    await video.play();
  } catch {
    if (err) {
      err.style.display = "block";
      err.textContent = "Camera is unavailable. Allow camera access on this device to scan a card.";
    }
  }

  capture?.addEventListener("click", () => {
    if (!video.videoWidth || !scanIndex.length) return;
    const vec = fingerprintFromCanvas(video, video.videoWidth, video.videoHeight);
    const ranked = scanIndex
      .map((row) => ({ id: row.id, src: row.src, score: distance(vec, row.vec) }))
      .sort((a, b) => a.score - b.score);
    const unique = [];
    for (const row of ranked) {
      if (unique.some((h) => h.id === row.id)) continue;
      unique.push(row);
      if (unique.length === 5) break;
    }
    const hits = document.getElementById("scan-hits");
    if (!hits) return;
    hits.innerHTML = unique
      .map((hit, i) => {
        const card = CARD_BY_ID[hit.id];
        if (!card) return "";
        return `<button type="button" class="surface hit" data-open="${hit.id}">
          <img src="${hit.src}" alt="" />
          <div>
            <p style="margin:0;font-size:0.75rem;font-weight:700;color:var(--cyan-deep)">#${i + 1}</p>
            <p style="margin:0;font-weight:700">${escapeHtml(card.name.en)}</p>
            <p class="muted" style="margin:0;font-size:0.75rem">${escapeHtml(card.setcodes[0] || "")}</p>
          </div>
        </button>`;
      })
      .join("");
    hits.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        modalArtIndex = 0;
        openCard(btn.getAttribute("data-open"));
      });
    });
  });
}

applyTheme();
subscribe(() => render());
render();
buildScanIndex();
