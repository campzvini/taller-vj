// ────────────────────────────────────────────
// TALLER VJ APP 0.9 — live.ts
// § - Effective values, so a modulated control visibly moves · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { create } from 'zustand';
import type { Dest } from './modulation';

/**
 * O valor do slider é a BASE e continua sendo do operador. O que a modulação
 * produz vive aqui, separado, e é o que a interface EXIBE — assim o ponteiro do
 * crossfader anda sozinho quando o áudio está no comando, sem sujar a sessão
 * salva nem brigar com a mão de quem está tocando.
 */
export type Live = {
  val: Partial<Record<Dest, number>>;
  ativos: Partial<Record<Dest, boolean>>;
  push: (v: Partial<Record<Dest, number>>, ativos: Partial<Record<Dest, boolean>>) => void;
  limpar: () => void;
};

export const useLive = create<Live>(set => ({
  val: {}, ativos: {},
  push: (val, ativos) => set({ val, ativos }),
  limpar: () => set({ val: {}, ativos: {} })
}));

/** Valor a exibir: o efetivo quando há modulação, senão a base do operador. */
export const mostrado = (dest: Dest, base: number) => {
  const v = useLive.getState().val[dest];
  return v == null ? base : v;
};
