// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — types.ts
// § - Shared domain types · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
export type Deck = 'A' | 'B';
export type Lane = 'A' | 'B' | 'C';        // C = audio bed
export type FxBus = 'A' | 'B' | 'M';
export type MarkOwner = 'A' | 'B' | 'P';   // P = cue

export type Item = {
  id: string;
  title: string;
  thumb: string;
  plist?: string;        // se for playlist
  in?: number | null;    // trecho
  out?: number | null;
  _from?: Lane | 'res';  // origem do arraste, nunca persistido
};

export type Mark = { in?: number | null; out?: number | null };

export const FX_NAMES = ['glitch', 'invert', 'melt', 'hue', 'strobe'] as const;
export type FxName = typeof FX_NAMES[number];

export const clean = (r: Item): Item => { const { _from, ...rest } = r; return rest; };

export const fmt = (t?: number | null) =>
  t == null ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
