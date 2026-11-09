# Wish Index

Client-side **WIXOSS Diva** card database + deckbuilder for **GitHub Pages**.

Pure HTML / CSS / JS. No build step. No backend.

## Host on GitHub Pages

1. Create a repo and push the contents of this folder to the **root** (or a `docs/` folder).
2. Settings → Pages → Deploy from branch → `main` / root (or `/docs`).
3. Open the site URL.

Because modules use ES imports, the site must be served over **http(s)** (GitHub Pages is fine). Opening `index.html` via `file://` will not work.

Local preview:

```bash
npx serve .
# or: python -m http.server 8080
```

## Layout

```text
wish-index/
  index.html
  css/styles.css
  js/
    app.js           # UI + wiring
    store.js         # prefs + deck (localStorage)
    cards-data.js    # card database (edit this)
    icons.js         # [Blue], [Auto], … replacements
    filter.js
    images.js
    card-text.js
    export-deck.js
    fingerprint.js   # camera art matching
  cards/en/ …        # English art
  cards/jp/ …        # Japanese art
  icons/
  brand/
```

## Adding cards

Edit `js/cards-data.js`. One object = one unique card; put all printings/setcodes and arts on that entry.

```js
{
  id: "unique-id",
  setcodes: ["WX25-P03-000"],
  name: { en: "…", jp: "…" },
  type: "SIGNI",           // LRIG | ASSIST LRIG | SIGNI | RESONA | SPELL | ARTS | PIECE | TOKEN
  colors: ["Blue"],        // multi-color: ["Blue", "Red"]
  cost: null,              // or ["Blue", "Blue"]
  level: 3,
  limit: null,
  power: 10000,
  class: "Nature Tone: Bacteria",
  team: null,
  lrigType: null,
  useTiming: null,
  growCost: null,
  lifeBurst: false,
  illustrator: "…",
  text: { en: "… [Blue] …", jp: "…" },
  images: {
    en: { default: "cards/en/foo.jpg", alts: ["cards/en/foo-alt.jpg"] },
    jp: { default: "cards/jp/foo.png", alts: [] }
  },
  related: ["other-card-id"],
  extra: {}
}
```

Drop image files under `cards/en/` and `cards/jp/`. Missing text or art shows **Not available**.

## Icons in text

Tokens like `[Blue]` or `[Turn2]` are replaced via `js/icons.js`. Add keys there as needed.

## Features

- **Database** — multi-select filters, contains-any / exact color modes, EN/JP text & art toggles, modal viewer, related-card thumbnails (no “add to deck” here).
- **Deck** — self-contained search/add, main + LRIG zones, Diva-ish limits (4 main / 1 LRIG / 20 LB / 10–12 LRIG deck), image export (LB column left, other main cards right, LRIG bottom).
- **Scan** — camera + art fingerprint match (top 5).
- **Dark mode** — localStorage prefs.

## Sample data

Six example cards from the WX25-P03 set (proxies for illustration only). Replace with your own data and official art as appropriate.
