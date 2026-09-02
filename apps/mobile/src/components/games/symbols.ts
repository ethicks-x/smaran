import type { TFunction } from "i18next";

/**
 * The faces a matching card can wear.
 *
 * Emoji rather than drawings we would have to ship and translate: every phone
 * already has them, they carry no words, and they are the same picture in all
 * four languages. Each one is named in the catalogues under
 * `games.symbols.*` — that name is what a screen reader announces, so
 * the picture is never the only cue (§2.3).
 *
 * Nothing here is newer than Unicode 11, which is where an emoji stops being a
 * safe bet on the low-end Android phones this app is built for: a face the
 * platform has never heard of draws as an empty box, and a board of empty boxes
 * is not a game. Check that before adding one.
 *
 * There are eighty-six because the twelve-by-twelve board needs seventy-two
 * distinct pairs in one deal (D-18). Anything smaller and cards would have to
 * repeat, which is a different game.
 */
export const Symbols = {
  dog: "🐶",
  cat: "🐱",
  cow: "🐄",
  goat: "🐐",
  horse: "🐴",
  elephant: "🐘",
  tiger: "🐯",
  monkey: "🐒",
  rabbit: "🐰",
  mouse: "🐭",
  hen: "🐔",
  duck: "🦆",
  bird: "🐦",
  fish: "🐟",
  butterfly: "🦋",
  bee: "🐝",
  frog: "🐸",
  snake: "🐍",
  turtle: "🐢",
  owl: "🦉",
  peacock: "🦚",
  pig: "🐷",
  sheep: "🐑",
  buffalo: "🐃",
  apple: "🍎",
  banana: "🍌",
  mango: "🥭",
  orange: "🍊",
  grapes: "🍇",
  watermelon: "🍉",
  pineapple: "🍍",
  coconut: "🥥",
  lemon: "🍋",
  strawberry: "🍓",
  cherry: "🍒",
  tomato: "🍅",
  carrot: "🥕",
  chilli: "🌶️",
  potato: "🥔",
  aubergine: "🍆",
  rice: "🍚",
  bread: "🍞",
  egg: "🥚",
  milk: "🥛",
  tea: "🍵",
  coffee: "☕",
  cake: "🍰",
  honey: "🍯",
  sun: "☀️",
  moon: "🌙",
  star: "⭐",
  cloud: "☁️",
  rain: "🌧️",
  rainbow: "🌈",
  fire: "🔥",
  water: "💧",
  tree: "🌳",
  leaf: "🍃",
  hibiscus: "🌺",
  rose: "🌹",
  sunflower: "🌻",
  tulip: "🌷",
  blossom: "🌸",
  bouquet: "💐",
  house: "🏠",
  door: "🚪",
  key: "🔑",
  clock: "🕐",
  lamp: "💡",
  candle: "🕯️",
  book: "📖",
  pen: "🖊️",
  scissors: "✂️",
  umbrella: "☂️",
  bed: "🛏️",
  basket: "🧺",
  car: "🚗",
  bus: "🚌",
  bicycle: "🚲",
  boat: "⛵",
  train: "🚂",
  aeroplane: "✈️",
  drum: "🥁",
  bell: "🔔",
  ball: "⚽",
  balloon: "🎈",
} as const;

export type SymbolId = keyof typeof Symbols;

/**
 * A symbol's name in the reader's language — what a screen reader announces in
 * place of the picture.
 *
 * The catalogue lookup lives here, in one place, rather than at each call site.
 * `games.symbols.<id>` is a template-literal key resolved against the whole
 * catalogue's key union, and eighty-six symbols make that one of the most
 * expensive types in the app; TypeScript budgets type instantiations per file,
 * so a screen doing it five times sits near the limit and tips over the next
 * time anybody adds copy — with the error landing on a line nobody touched, in
 * a screen that has nothing to do with the change. Paying it once here keeps
 * that budget out of the screens.
 */
export function symbolName(t: TFunction, symbol: SymbolId): string {
  return t(`games.symbols.${symbol}`);
}

/**
 * Which faces a board may be dealt from, and the second of the three dials that
 * make one board harder than another (D-18).
 *
 * `plain` is two dozen things that share nothing — a sun cannot be mistaken for
 * a boat at arm's length, so the small boards ask you to remember where a card
 * is and nothing else. `wide` is every face there is, and it necessarily
 * includes the ones that rhyme: three round red fruits, six flowering things,
 * two cups. A big board is harder twice over, and that is deliberate.
 */
export const SymbolPools = {
  plain: [
    "sun",
    "moon",
    "star",
    "rain",
    "fire",
    "tree",
    "house",
    "door",
    "key",
    "clock",
    "book",
    "umbrella",
    "car",
    "boat",
    "aeroplane",
    "train",
    "fish",
    "bird",
    "elephant",
    "cat",
    "dog",
    "ball",
    "bell",
    "drum",
  ],
  wide: symbolIds(),
} as const satisfies Record<string, readonly SymbolId[]>;

export type SymbolPool = keyof typeof SymbolPools;

/**
 * `Object.keys` widens to `string[]` and loses the literal types the table
 * above is written in, so the ids are read back through one narrow helper
 * rather than asserted at every use.
 */
function symbolIds(): SymbolId[] {
  return Object.keys(Symbols) as SymbolId[];
}
