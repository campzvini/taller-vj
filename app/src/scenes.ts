// ────────────────────────────────────────────
// TALLER VJ APP 0.9 — scenes.ts
// § - Snapshot of the whole mix, recalled dry or interpolated · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { out } from './out';
import { applyOpacity, applyPos, applyXf, applyZoom, setAmt } from './actions';
import { GLFX0, type GlFx } from './gl/renderer';
import type { Curve, Deck, FxBus, FxName, Pos } from './types';
import { POS0 } from './types';

/**
 * Cena é o estado da MISTURA, não do conteúdo: quem está tocando continua tocando.
 * É isso que permite chamar uma cena no meio da música sem cortar a imagem — e é
 * também o que faz automação e MIDI custarem pouco depois, porque tudo já passa aqui.
 */
export type Estado = {
  xf: number;
  op: Record<Deck, number>;
  zoom: Record<Deck, number>;
  pos: Record<Deck, Pos>;
  blend: string; smooth: number; curve: Curve; blackout: boolean;
  fx: Record<FxBus, FxName[]>; amt: Record<FxBus, number>;
  glfx: Record<Deck, GlFx>;
  samp: { blend: string; zoom: number; fade: number };
};

export type Cena = { id: string; nome: string; estado: Estado };

const DECKS: Deck[] = ['A', 'B'];
const BUSES: FxBus[] = ['A', 'B', 'M'];

export function capturar(nome: string): Cena {
  const s = useSession.getState();
  return {
    id: Math.random().toString(36).slice(2, 8),
    nome,
    estado: {
      xf: s.xf,
      op: { ...s.op }, zoom: { ...s.zoom },
      pos: { A: { ...s.pos.A }, B: { ...s.pos.B } },
      blend: s.blend, smooth: s.smooth, curve: s.curve, blackout: s.blackout,
      fx: { A: [...s.fx.A], B: [...s.fx.B], M: [...s.fx.M] },
      amt: { ...s.amt },
      glfx: { A: { ...s.glfx.A }, B: { ...s.glfx.B } },
      samp: { blend: s.sampBlend, zoom: s.sampZoom, fade: s.sampFade }
    }
  };
}

const mistura = (a: number, b: number, p: number) => a + (b - a) * p;
let raf = 0;

/** Aplica de uma vez (ms=0) ou caminha até lá. O que é liga/desliga entra no começo. */
export function aplicar(c: Cena, ms = 0) {
  cancelAnimationFrame(raf);
  const e = c.estado;
  const s = useSession.getState();

  // parte discreta: não existe meio caminho entre dois modos de mistura
  s.set('blend', e.blend ?? 'normal'); out.blend(e.blend ?? 'normal');
  s.set('curve', (e.curve ?? 'linear') as Curve);
  s.set('smooth', e.smooth ?? 60); out.smooth(e.smooth ?? 60);
  s.set('blackout', !!e.blackout); out.blackout(!!e.blackout);
  s.set('fx', { A: new Set(e.fx?.A ?? []), B: new Set(e.fx?.B ?? []), M: new Set(e.fx?.M ?? []) } as never);
  BUSES.forEach(b => out.fxBus(b, e.fx?.[b] ?? [], e.amt?.[b] ?? 1));
  if (e.samp) {
    s.set('sampBlend', e.samp.blend); out.sampBlend(e.samp.blend);
    s.set('sampZoom', e.samp.zoom); out.sampZoom(+(e.samp.zoom / 100).toFixed(3));
    s.set('sampFade', e.samp.fade); out.sampFade(e.samp.fade);
  }

  const de = capturar('').estado;   // ponto de partida real, para interpolar
  const passo = (p: number) => {
    const v = useSession.getState();
    applyXf(Math.round(mistura(de.xf, e.xf ?? de.xf, p)));
    DECKS.forEach(d => {
      applyOpacity(d, Math.round(mistura(de.op[d], e.op?.[d] ?? de.op[d], p)));
      applyZoom(d, Math.round(mistura(de.zoom[d], e.zoom?.[d] ?? de.zoom[d], p)));
      const a = de.pos[d], b = e.pos?.[d] ?? POS0;
      applyPos(d, {
        pan: [Math.round(mistura(a.pan[0], b.pan[0], p)), Math.round(mistura(a.pan[1], b.pan[1], p))],
        rot: Math.round(mistura(a.rot, b.rot, p)),
        flipH: p < 1 ? a.flipH : b.flipH, flipV: p < 1 ? a.flipV : b.flipV,
        crop: a.crop.map((c0, i) => Math.round(mistura(c0, b.crop[i] ?? 0, p))) as Pos['crop']
      });
      const g0 = de.glfx[d], g1 = e.glfx?.[d] ?? GLFX0;
      const g = Object.fromEntries(
        (Object.keys(GLFX0) as (keyof GlFx)[]).map(k => [k, +mistura(g0[k], g1[k] ?? 0, p).toFixed(3)])
      ) as GlFx;
      v.set('glfx', { ...v.glfx, [d]: g } as never);
      out.glfx(d, g as unknown as Record<string, number>);
    });
    BUSES.forEach(b => setAmt(b, +mistura(de.amt[b], e.amt?.[b] ?? de.amt[b], p).toFixed(3)));
  };

  if (ms <= 0) { passo(1); return; }
  const t0 = performance.now();
  const anda = (t: number) => {
    const p = Math.min(1, (t - t0) / ms);
    passo(p < 1 ? (p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2) : 1);
    if (p < 1) raf = requestAnimationFrame(anda);
  };
  raf = requestAnimationFrame(anda);
}

export function chamar(i: number) {
  const s = useSession.getState();
  const c = s.cenas[i];
  if (c) aplicar(c, s.cenaFade);
  return !!c;
}
