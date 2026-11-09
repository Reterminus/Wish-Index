import { CARD_BY_ID } from "./cards-data.js";
import { primaryImage } from "./images.js";

function load(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function exportDeckImage(name, deck, lang) {
  const expanded = (zone, lb) => {
    const out = [];
    for (const entry of deck.filter((e) => e.zone === zone)) {
      const card = CARD_BY_ID[entry.id];
      if (!card) continue;
      if (lb !== null && card.lifeBurst !== lb) continue;
      const src = primaryImage(card, lang);
      for (let i = 0; i < entry.count; i++) out.push(src || "");
    }
    return out;
  };

  const left = expanded("main", true);
  const right = expanded("main", false);
  const lrig = expanded("lrig", null);

  const cellW = 120;
  const cellH = 168;
  const gap = 8;
  const cols = 4;
  const pad = 28;
  const header = 92;
  const leftRows = Math.max(1, Math.ceil(left.length / cols) || 1);
  const rightRows = Math.max(1, Math.ceil(right.length / cols) || 1);
  const mainRows = Math.max(leftRows, rightRows);
  const blockW = cols * cellW + (cols - 1) * gap;
  const width = pad * 2 + blockW * 2 + 36;
  const mainH = mainRows * cellH + (mainRows - 1) * gap;
  const lrigCols = 10;
  const lrigRows = Math.max(1, Math.ceil(lrig.length / lrigCols) || 1);
  const lrigScale = 0.72;
  const height = header + mainH + 56 + lrigRows * (cellH * lrigScale + gap) + pad;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.fillStyle = "#10151d";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f4f7fb";
  ctx.font = "700 28px Outfit, sans-serif";
  ctx.fillText(name || "Wish Index Deck", pad, 42);
  ctx.font = "600 14px Outfit, sans-serif";
  ctx.fillStyle = "#9eb0c6";
  ctx.fillText(`Main ${left.length + right.length}   ·   LRIG deck ${lrig.length}`, pad, 68);

  const drawCards = async (srcs, x, y, perRow, scale) => {
    const w = cellW * scale;
    const h = cellH * scale;
    for (let i = 0; i < srcs.length; i++) {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const dx = x + col * (w + gap);
      const dy = y + row * (h + gap);
      ctx.fillStyle = "#1b2430";
      roundRect(ctx, dx, dy, w, h, 8);
      ctx.fill();
      const src = srcs[i];
      if (!src) continue;
      const img = await load(src);
      if (!img) continue;
      ctx.save();
      roundRect(ctx, dx, dy, w, h, 8);
      ctx.clip();
      ctx.drawImage(img, dx, dy, w, h);
      ctx.restore();
    }
  };

  await drawCards(left, pad, header, cols, 1);
  await drawCards(right, pad + blockW + 36, header, cols, 1);
  if (lrig.length) {
    ctx.fillStyle = "#9eb0c6";
    ctx.font = "700 13px Outfit, sans-serif";
    ctx.fillText("LRIG DECK", pad, header + mainH + 28);
    await drawCards(lrig, pad, header + mainH + 40, lrigCols, lrigScale);
  }

  return canvas.toDataURL("image/png");
}
