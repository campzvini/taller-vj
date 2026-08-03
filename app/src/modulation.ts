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

export type Modo = 'escalar' | 'somar';

export type Mod = {
  id: string;
  on: boolean;
  src: Src;
  dest: Dest;
  modo?: Modo;       // ausente = 'escalar' (sessões antigas)
  amount: number;    // 0..100 em escalar (quanto a fonte manda) | -100..100 em somar
  compassos: number; // período do LFO, em batidas
};

export const SRC_LABEL: Record<Src, string> = {
  low: 'bass', mid: 'mids', high: 'highs', rms: 'level', beat: 'beat',
  sine: 'sine', tri: 'triangle', saw: 'saw', rand: 'random'
};
export const DEST_LABEL: Record<Dest, string> = {
  opA: 'opacity A', opB: 'opacity B', zoomA: 'zoom A', zoomB: 'zoom B',
  xf: 'crossfader', amtM: 'master amount', panxA: 'pan X A', panxB: 'pan X B'
};

export const novoMod = (): Mod => ({
  id: Math.random().toString(36).slice(2, 8),
  on: true, src: 'low', dest: 'opB', modo: 'escalar', amount: 100, compassos: 4
});

export const MODO_LABEL: Record<Modo, string> = {
  escalar: 'scale: pulses between 0 and the control value',
  somar: 'offset: adds to the control value'
};

let raf = 0;
let ultimoEnvio: Record<string, number> = {};
let decayBeat = 0;
let ultimaUI = 0;
const soltos = new Set<Dest>();   // destinos que estavam modulados e precisam voltar

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
    if (!mods.length && !soltos.size) {
      if (Object.keys(useLive.getState().val).length) useLive.getState().limpar();
      return;
    }

    const t = performance.now();
    const bpm = s.bpmManual || audio.bpm;

    /* Duas formas de escrever no parâmetro, e a diferença importa:
       - escalar: o valor do controle é o TETO e a fonte faz pulsar entre 0 e ele.
         É o que se espera de opacidade e intensidade, que já vivem no máximo.
       - somar: desloca a partir do valor do controle. Serve para pan e crossfader,
         onde o interessante é oscilar em torno de onde a mão deixou. */
    const escala: Partial<Record<Dest, number>> = {};
    const soma: Partial<Record<Dest, number>> = {};
    for (const m of mods) {
      const v = valorFonte(m, t, bpm);
      if ((m.modo ?? 'escalar') === 'somar') {
        soma[m.dest] = (soma[m.dest] ?? 0) + v * m.amount;
      } else {
        const k = Math.abs(m.amount) / 100;
        const f = 1 - k + k * v;                       // k=1 -> pulso total
        escala[m.dest] = (escala[m.dest] ?? 1) * f;
      }
    }
    const aplica = (d: Dest, base: number) =>
      base * (escala[d] ?? 1) + (soma[d] ?? 0);
    const tocado = (d: Dest) => escala[d] != null || soma[d] != null;

    const envia = (k: string, v: number, fn: (x: number) => void) => {
      if (Math.abs((ultimoEnvio[k] ?? -999) - v) < 0.5) return;
      ultimoEnvio[k] = v; fn(v);
    };
    const lim = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

    // valores efetivos, para a interface mostrar o controle andando sozinho
    const efetivo: Partial<Record<Dest, number>> = {};
    const ativos: Partial<Record<Dest, boolean>> = {};

    // cada destino sabe seu limite e como chega até a saída
    const rotas: { d: Dest; base: number; min: number; max: number; env: (v: number) => void }[] = [];
    (['A', 'B'] as Deck[]).forEach(d => {
      rotas.push({ d: ('op' + d) as Dest, base: s.op[d], min: 0, max: 100,
        env: v => out.opacity(d, v / 100) });
      rotas.push({ d: ('zoom' + d) as Dest, base: s.zoom[d], min: 100, max: 300,
        env: v => out.zoomCh(d, +(v / 100).toFixed(3)) });
      rotas.push({ d: ('panx' + d) as Dest, base: s.pos[d].pan[0], min: -50, max: 50,
        env: v => out.pos(d, { ...s.pos[d], pan: [v, s.pos[d].pan[1]] }) });
    });
    rotas.push({ d: 'xf', base: s.xf, min: 0, max: 100, env: v => out.xf(v) });
    rotas.push({ d: 'amtM', base: s.amt.M * 100, min: 0, max: 100,
      env: v => out.fxBus('M', [...s.fx.M], v / 100) });

    for (const r of rotas) {
      if (tocado(r.d)) {
        const v = lim(aplica(r.d, r.base), r.min, r.max);
        efetivo[r.d] = v; ativos[r.d] = true;
        envia(r.d, v, r.env);
      } else if (soltos.has(r.d)) {
        // a rota foi desligada: devolve o parâmetro ao valor do controle, senão
        // ele fica congelado no último valor modulado
        soltos.delete(r.d);
        ultimoEnvio[r.d] = NaN;
        envia(r.d, r.base, r.env);
      }
    }
    Object.keys(ativos).forEach(k => soltos.add(k as Dest));

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
