import { ICON_MAP } from "./icons.js";

const TOKEN = /\[([^\]]+)\]/g;

/** Line starts a Life Burst ability: [Life Burst] only (no legacy LifeBurst). */
function isLifeBurstStart(line) {
  return /^\s*\[Life Burst\]/i.test(line);
}

/**
 * Line starts a different top-level ability.
 * Used so text that appears *after* a Life Burst block is not swallowed.
 */
function isOtherAbilityStart(line) {
  if (isLifeBurstStart(line)) return false;
  return /^\s*\[(Auto|Action|Enter|Constant|On Play|Starting|Once per Game|Once Per Game)\]/i.test(
    line,
  );
}

export function renderCardText(text) {
  if (!text || /^not available/i.test(text.trim())) {
    return `<p class="muted">Not available</p>`;
  }

  const lines = text.split("\n");
  const parts = [];
  let i = 0;

  while (i < lines.length) {
    if (isLifeBurstStart(lines[i])) {
      const blockLines = [];
      while (i < lines.length) {
        // Stop if a new non-LB ability begins (text can follow Life Burst)
        if (blockLines.length > 0 && isOtherAbilityStart(lines[i])) break;
        blockLines.push(lines[i]);
        i++;
      }
      // Drop trailing blank lines inside the block for tighter padding
      while (blockLines.length && !blockLines[blockLines.length - 1].trim()) {
        blockLines.pop();
      }
      const inner = blockLines.map((line) => `<p>${renderLine(line)}</p>`).join("");
      parts.push(`<div class="life-burst-block">${inner}</div>`);
    } else {
      parts.push(`<p>${renderLine(lines[i])}</p>`);
      i++;
    }
  }

  return parts.join("");
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
