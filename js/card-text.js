import { ICON_MAP } from "./icons.js";

const TOKEN = /\[([^\]]+)\]/g;

export function renderCardText(text) {
  if (!text || /^not available/i.test(text.trim())) {
    return `<p class="muted">Not available</p>`;
  }
  return text
    .split("\n")
    .map((line) => `<p>${renderLine(line)}</p>`)
    .join("");
}

function renderLine(line) {
  let html = "";
  let last = 0;
  const re = new RegExp(TOKEN.source, "g");
  let match;
  while ((match = re.exec(line))) {
    if (match.index > last) html += escapeHtml(line.slice(last, match.index));
    html += iconHtml(match[1]);
    last = match.index + match[0].length;
  }
  if (last < line.length) html += escapeHtml(line.slice(last));
  return html;
}

/** Render a single token name (Blue, Turn2, …) as an icon. */
export function iconHtml(name) {
  const spec = ICON_MAP[name];
  if (!spec) return `<span style="font-weight:700">[${escapeHtml(name)}]</span>`;
  if (spec.kind === "image") {
    return `<img class="icon-token" src="${spec.src}" alt="${escapeHtml(spec.label)}" title="${escapeHtml(spec.label)}" />`;
  }
  if (spec.kind === "swatch") {
    return `<span class="icon-token" title="${escapeHtml(spec.label)}" style="background:${spec.color}"></span>`;
  }
  return `<span class="icon-pill ${spec.tone}">${escapeHtml(spec.label)}</span>`;
}

/** cost / growCost arrays like ["Blue","Blue"] → orb icons */
export function renderCostIcons(colors) {
  if (!colors || !colors.length) return "—";
  return colors.map((c) => iconHtml(c)).join("");
}

export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
