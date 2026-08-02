// ────────────────────────────────────────────
// TALLER VJ APP 0.7 — modulation.ts
// § - One writer for every parameter: audio, LFO and beat · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { audio } from './audio';
import { out } from './out';
import { useSession } from './store';
import { useLive } from './live';
import type { Deck } from './types';

/**
 * LFO, áudio e batida são a MESMA coisa vista de ângulos diferentes: alguém
 * escrevendo num parâmetro. Por isso existe um único caminho de escrita — se cada
 * um mexesse direto no controle, eles brigariam entre si e com o operador.
 * O valor do slider continua sendo a BASE; a modulação soma por cima, sem gravar.
 */
export type Src = 'low' | 'mid' | 'high' | 'rms' | 'beat' | 'sine' | 'tri' | 'saw' | 'rand';
export type Dest = 'opA' | 'opB' | 'zoomA' | 'zoomB' | 'xf' | 'amtM' | 'panxA' | 'panxB';

export type Mod = {
  id: string;
  on: boolean;
  src: Src;
  dest: Dest;
  amount: number;    // -100..100, em unidades do destino
  compassos: number; // período do LFO, em batidas
};

export const SRC_LABEL: Record<Src, string> = {
  low: 'graves', mid: 'médios', high: 'agudos', rms: 'volume', beat: 'batida',
  sine: 'onda senoidal', tri: 'triangular', saw: 'dente de serra', rand: 'aleatório'
};
export const DEST_LABEL: Record<Dest, string> = {
  opA: 'opacidade A', opB: 'opacidade B', zoomA: 'zoom A', zoomB: 'zoom B',
  xf: 'crossfader', amtM: 'intensidade master', panxA: 'pan X A', panxB: 'pan X B'
};

export const novoMod = (): Mod => ({
  id: Math.random().toString(36).slice(2, 8),
  on: true, src: 'low', dest: 'opB', amount: 30, compassos: 4
});

let raf = 0;
let ultimoEnvio: Record<string, number> = {};
let decayBeat = 0;
let ultimaUI = 0;

const onda = (shape: Src, fase: number) => {
  switch (shape) {
    case 'sine': return (Math.sin(fase * Math.PI * 2) + 1) / 2;
    case 'tri': return 1 - Math.abs((fase % 1) * 2 - 1);
    case 'saw': return fase % 1;
    case 'rand': return Math.random();
    default: return 0;
  }
};

function valorFonte(m: Mod, t: number, bpm: number): number {
  if (m.src === 'beat') {
    if (audio.beat) decayBeat = 1;
    decayBeat *= 0.88;                        // envelope curto: pulso, não degrau
    return decayBeat;
  }
  if (m.src === 'low' || m.src === 'mid' || m.src === 'high' || m.src === 'rms') {
    return audio.bands[m.src];
  }
  const beatMs = 60000 / (bpm || 120);
  const periodo = beatMs * Math.max(1, m.compassos);
  return onda(m.src, (t % periodo) / periodo);
}

export function startModulation() {
  const passo = () => {
    raf = requestAnimationFrame(passo);
    const s = useSession.getState();
    const mods = s.mods.filter(m => m.on);
    if (!mods.length) {
      if (Object.keys(useLive.getState().val).length) useLive.getState().limpar();
      return;
    }

    const t = performance.now();
    const alvo: Partial<Record<Dest, number>> = {};
    for (const m of mods) {
      const v = valorFonte(m, t, s.bpmManual || audio.bpm);
      alvo[m.dest] = (alvo[m.dest] ?? 0) + v * m.amount;
    }

    const envia = (k: string, v: number, fn: (x: number) => void) => {
      if (Math.abs((ultimoEnvio[k] ?? -999) - v) < 0.5) return;
      ultimoEnvio[k] = v; fn(v);
    };
    const lim = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

    // valores efetivos, para a interface mostrar o controle andando sozinho
    const efetivo: Partial<Record<Dest, number>> = {};
    const ativos: Partial<Record<Dest, boolean>> = {};
    for (const m of mods) ativos[m.dest] = true;

    (['A', 'B'] as Deck[]).forEach(d => {
      const op = alvo[('op' + d) as Dest];
      if (op != null) {
        const v = lim(s.op[d] + op, 0, 100);
        efetivo[('op' + d) as Dest] = v;
        envia('op' + d, v, x => out.opacity(d, x / 100));
      }
      const zm = alvo[('zoom' + d) as Dest];
      if (zm != null) {
        const v = lim(s.zoom[d] + zm, 100, 300);
        efetivo[('zoom' + d) as Dest] = v;
        envia('zoom' + d, v, x => out.zoomCh(d, +(x / 100).toFixed(3)));
      }
      const px = alvo[('panx' + d) as Dest];
      if (px != null) {
        const v = lim(s.pos[d].pan[0] + px, -50, 50);
        efetivo[('panx' + d) as Dest] = v;
        envia('panx' + d, v, x => out.pos(d, { ...s.pos[d], pan: [x, s.pos[d].pan[1]] }));
      }
    });
    if (alvo.xf != null) {
      const v = lim(s.xf + alvo.xf, 0, 100);
      efetivo.xf = v;
      envia('xf', v, x => out.xf(x));
    }
    if (alvo.amtM != null) {
      const v = lim(s.amt.M * 100 + alvo.amtM, 0, 100);
      efetivo.amtM = v;
      envia('amtM', v, x => out.fxBus('M', [...s.fx.M], x / 100));
    }

    // a interface acompanha a 30fps: suficiente para o olho, barato para o React
    if (t - ultimaUI > 33) { ultimaUI = t; useLive.getState().push(efetivo, ativos); }
  };
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(passo);
}

export function stopModulation() {
  cancelAnimationFrame(raf);
  ultimoEnvio = {};
  useLive.getState().limpar();
}
