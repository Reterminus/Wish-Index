export function imageList(card, lang) {
  const pack = card.images[lang] || { default: null, alts: [] };
  return [pack.default, ...(pack.alts || [])].filter(Boolean);
}

export function primaryImage(card, lang) {
  const preferred = imageList(card, lang);
  return preferred[0] || null;
}
