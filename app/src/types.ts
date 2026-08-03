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

// fontes convivem: YouTube segue padrão, as outras são opção do operador
export type Kind = 'yt' | 'file';

export type Item = {
  id: string;
  title: string;
  thumb: string;
  kind?: Kind;           // ausente = 'yt', para compatibilidade com sessões antigas
  src?: string;          // caminho no disco, quando kind='file'
  dur?: number;
  plist?: string;        // se for playlist
  in?: number | null;    // trecho
  out?: number | null;
  // metadados de vitrine: vêm da mesma chamada que já filtra embutível e vertical
  canal?: string;
  views?: number;
  ano?: string;
  _from?: Lane | 'res';  // origem do arraste, nunca persistido
};

/** 1.2M, 340k, 87 — número curto o suficiente para caber numa miniatura. */
export const curto = (n?: number) =>
  n == null ? '' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M'
    : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
export const kindOf = (i?: Item | null): Kind => i?.kind ?? 'yt';
// caminho local vira URL servida pelo http interno (file:// é bloqueado numa página http)
export const localUrl = (p: string) => `${location.origin}/local?p=${encodeURIComponent(p)}`;
// fonte remota (Archive) já é URL; caminho de disco precisa passar pelo http interno
export const srcUrl = (p: string) => /^https?:/i.test(p) ? p : localUrl(p);

export type Mark = { in?: number | null; out?: number | null };

// posicionamento por canal, além do zoom
export type Pos = {
  pan: [number, number];      // % do quadro
  rot: number;                // graus
  flipH: boolean; flipV: boolean;
  crop: [number, number, number, number];   // top right bottom left, em %
};
export const POS0: Pos = { pan: [0, 0], rot: 0, flipH: false, flipV: false, crop: [0, 0, 0, 0] };

// curva do crossfader: muda completamente a sensação da mão
export type Curve = 'linear' | 'log' | 'cut';
export const curveAt = (v: number, c: Curve) => {
  const t = v / 100;
  if (c === 'cut') return t < .5 ? 0 : 100;
  if (c === 'log') return Math.round(Math.pow(t, 2.2) * 100);
  return v;
};

export const FX_NAMES = ['glitch', 'invert', 'melt', 'hue', 'strobe'] as const;
export type FxName = typeof FX_NAMES[number];

export const clean = (r: Item): Item => { const { _from, ...rest } = r; return rest; };

export const fmt = (t?: number | null) =>
  t == null ? '—' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
