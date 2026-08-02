// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — out.ts
// § - Command surface towards the output window · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { makeBus, type Cmd, type Deck, type FxBus, type Tele } from './bus';

const bus = makeBus();

// Espelho local da telemetria: o controlador nunca lê o player da outra janela,
// ele lê daqui. Atualizado a cada 200ms pela saída.
export const tele = {
  live: false, lastAt: 0,
  decks: { A: { time: 0, state: -1, dur: 0 }, B: { time: 0, state: -1, dur: 0 } },
  samp: [0, 0, 0, 0] as number[]
};

bus.on(m => {
  if ('t' in m && m.t === 'tele') {
    const t = m as Tele;
    tele.decks = t.decks; tele.samp = t.samp;
    tele.live = true; tele.lastAt = performance.now();
  }
});

// a saída some se ninguém falar por um segundo
export const outLive = () => tele.live && performance.now() - tele.lastAt < 1000;

export const send = (c: Cmd) => bus.send(c);
export const onBus = bus.on;

export const out = {
  load: (deck: Deck, id: string) => send({ c: 'load', deck, id }),
  loadList: (deck: Deck, list: string) => send({ c: 'loadList', deck, list }),
  play: (deck: Deck) => send({ c: 'play', deck }),
  pause: (deck: Deck) => send({ c: 'pause', deck }),
  toggle: (deck: Deck) => send({ c: 'toggle', deck }),
  seek: (deck: Deck, t: number) => send({ c: 'seek', deck, t }),
  vol: (deck: Deck, v: number) => send({ c: 'vol', deck, v }),
  opacity: (deck: Deck, v: number) => send({ c: 'opacity', deck, v }),
  present: (deck: Deck, v: boolean) => send({ c: 'present', deck, v }),
  zoomCh: (deck: Deck, z: number) => send({ c: 'zoomCh', deck, z }),
  xf: (v: number) => send({ c: 'xf', v }),
  smooth: (ms: number) => send({ c: 'smooth', ms }),
  blend: (mode: string) => send({ c: 'blend', mode }),
  fxBus: (b: FxBus, fx: string[], amt: number) => send({ c: 'bus', bus: b, fx, amt }),
  frame: (ar: string) => send({ c: 'frame', ar }),
  pos: (deck: Deck, p: { pan: [number, number]; rot: number; flipH: boolean; flipV: boolean;
                         crop: [number, number, number, number] }) =>
    send({ c: 'pos', deck, ...p }),
  blackout: (on: boolean) => send({ c: 'blackout', on }),
  pattern: (name: string | null) => send({ c: 'pattern', name }),
  loop: (on: boolean) => send({ c: 'loop', on }),
  cc: (on: boolean) => send({ c: 'cc', on }),
  sampLoad: (i: number, id: string, tin: number) => send({ c: 'sampLoad', i, id, tin }),
  sampOn: (i: number) => send({ c: 'sampOn', i }),
  sampOff: (i: number, tin: number) => send({ c: 'sampOff', i, tin }),
  sampSeek: (i: number, t: number) => send({ c: 'sampSeek', i, t }),
  sampBlend: (mode: string) => send({ c: 'sampBlend', mode }),
  sampFade: (ms: number) => send({ c: 'sampFade', ms }),
  sampVol: (v: number) => send({ c: 'sampVol', v }),
  sampZoom: (z: number) => send({ c: 'sampZoom', z })
};
