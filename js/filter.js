function norm(value) {
  return String(value || "").toLowerCase();
}

function parsePower(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n < 1000 ? n * 1000 : n;
}

export function matches(card, f) {
  if (f.types.length && !f.types.includes(card.type)) return false;

  if (f.colors.length) {
    if (f.colorMode === "exact") {
      const a = [...card.colors].sort().join("|");
      const b = [...f.colors].sort().join("|");
      if (a !== b) return false;
    } else if (!f.colors.some((color) => card.colors.includes(color))) {
      return false;
    }
  }

  if (String(f.level || "").trim()) {
    const level = Number(f.level);
    if (!Number.isFinite(level) || card.level !== level) return false;
  }

  const min = parsePower(f.powerMin);
  const max = parsePower(f.powerMax);
  if (min !== null || max !== null) {
    if (card.power == null) return false;
    if (min !== null && max !== null) {
      if (card.power < Math.min(min, max) || card.power > Math.max(min, max)) return false;
    } else {
      const exact = min ?? max;
      if (card.power !== exact) return false;
    }
  }

  if (String(f.classQuery || "").trim()) {
    if (!norm(card.class).includes(norm(f.classQuery.trim()))) return false;
  }

  if (String(f.setQuery || "").trim()) {
    const q = norm(f.setQuery.trim());
    if (!card.setcodes.some((code) => norm(code).includes(q))) return false;
  }

  if (f.lifeBurst === "yes") {
    if (!card.lifeBurst || (card.type !== "SIGNI" && card.type !== "SPELL")) return false;
  }
  if (f.lifeBurst === "no") {
    if (card.type !== "SIGNI" && card.type !== "SPELL") return false;
    if (card.lifeBurst) return false;
  }

  if (String(f.query || "").trim()) {
    const q = norm(f.query.trim());
    const blob = [
      card.name.en,
      card.name.jp,
      card.text.en,
      card.text.jp,
      card.illustrator || "",
      card.type,
      card.class || "",
      card.team || "",
      card.lrigType || "",
      card.useTiming || "",
      ...card.setcodes,
    ]
      .join("\n")
      .toLowerCase();
    if (!blob.includes(q)) return false;
  }

  return true;
}
