/** Edit this map to add icon replacements for [Token] text. */
export const ICON_MAP = {
  Blue: { kind: "image", src: "icons/blue.png", label: "Blue" },
  Red: { kind: "image", src: "icons/red.png", label: "Red" },
  Green: { kind: "image", src: "icons/green.png", label: "Green" },
  White: { kind: "image", src: "icons/white.png", label: "White" },
  Black: { kind: "image", src: "icons/black.png", label: "Black" },
  Colorless: { kind: "image", src: "icons/colorless.png", label: "Colorless" },

  Down: { kind: "image", src: "icons/down.png", label: "Down" },
  Guard: { kind: "image", src: "icons/guard.png", label: "Guard" },

  Blue0: { kind: "image", src: "icons/blue0.png", label: "Blue 0" },
  White0: { kind: "image", src: "icons/white0.png", label: "White 0" },
  Turn1: { kind: "image", src: "icons/turn1.png", label: "1/Turn", wide: true },
  Turn2: { kind: "image", src: "icons/turn2.png", label: "2/Turn", wide: true },
  Game1: { kind: "image", src: "icons/game1.png", label: "Game1", wide: true },
  "Life Burst": { kind: "image", src: "icons/lifeburst.png", label: "Life Burst" },
  Coin: { kind: "image", src: "icons/coin.png", label: "Coin" },

  Auto: { kind: "image", src: "icons/auto.png", label: "Auto", wide: true },
  Action: { kind: "image", src: "icons/action.png", label: "Action", wide: true },
  Constant: { kind: "image", src: "icons/const.png", label: "Constant", wide: true },
  Enter: { kind: "image", src: "icons/enter.png", label: "Enter", wide: true },
};

export const COLOR_OPTIONS = [
  { id: "White",     icon: "icons/filter/white.png" },
  { id: "Red",       icon: "icons/filter/red.png" },
  { id: "Blue",      icon: "icons/filter/blue.png" },
  { id: "Green",     icon: "icons/filter/green.png" },
  { id: "Black",     icon: "icons/filter/black.png" },
  { id: "Colorless", icon: "icons/filter/colorless.png" },
];

export const TYPE_OPTIONS = [
  "LRIG",
  "ASSIST LRIG",
  "SIGNI",
  "RESONA",
  "SPELL",
  "ARTS",
  "PIECE",
  "TOKEN",
];
