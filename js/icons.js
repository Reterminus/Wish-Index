/** Edit this map to add icon replacements for [Token] text. */
export const ICON_MAP = {
  Blue: { kind: "image", src: "icons/blue.png", label: "Blue" },
  Red: { kind: "image", src: "icons/red.png", label: "Red" },
  Green: { kind: "image", src: "icons/green.png", label: "Green" },
  White: { kind: "image", src: "icons/white.png", label: "White" },
  Black: { kind: "image", src: "icons/black.png", label: "Black" },
  Colorless: { kind: "image", src: "icons/colorless.png", label: "Colorless" },
  Blue0: { kind: "image", src: "icons/blue.png", label: "Blue 0" },
  Auto: { kind: "image", src: "icons/auto.png", label: "Auto" },
  Action: { kind: "pill", label: "Action", tone: "cyan" },
  Constant: { kind: "pill", label: "Const", tone: "ink" },
  Turn1: { kind: "pill", label: "Turn 1", tone: "ink" },
  Turn2: { kind: "pill", label: "Turn 2", tone: "ink" },
  Game1: { kind: "pill", label: "Game 1", tone: "ink" },
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
