// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — store.ts
// § - Session state: libraries, slots, marks, mixer · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { create } from 'zustand';
import type { Mod } from './modulation';
import type { Cena } from './scenes';
import type { Modo as RecModo } from './record';
import { GLFX0, type GlFx } from './gl/renderer';
import type { Curve, Deck, FxBus, FxName, Item, Lane, Mark, MarkOwner, Pos } from './types';
import { clean, POS0 } from './types';

const LS = <T,>(k: string, fb: T): T => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
};

/** Sessões antigas guardavam duas listas de vídeo; viram uma só, sem repetidos. */
function migraAcervo(): Item[] {
  const v = LS('vj.libV', null as Item[] | null);
  if (v) return v;
  const juntos = [...LS('vj.libA', [] as Item[]), ...LS('vj.libB', [] as Item[])];
  const vistos = new Set<string>();
  return juntos.filter(i => !vistos.has(i.id) && vistos.add(i.id));
}

export type Session = {
  // biblioteca
  results: Item[]; sel: number | null;
  lib: Record<Lane, Item[]>;   // V = vídeo (comum aos dois decks), C = bed
  now: Record<Deck | 'C' | 'P', Item | null>;
  slots: (Item | null)[];

  // trecho e transporte
  mark: Record<MarkOwner, Mark>;
  tloop: Record<Deck, boolean>;
  armed: Deck;

  // mixer
  xf: number; op: Record<Deck, number>; zoom: Record<Deck, number>;
  pos: Record<Deck, Pos>; curve: Curve; blackout: boolean; pattern: string | null;
  blend: string; smooth: number; ar: string;
  fx: Record<FxBus, Set<FxName>>; amt: Record<FxBus, number>;
  bus: FxBus;
  loop: boolean; cc: boolean;

  // áudio
  amode: string; vol: Record<Deck | 'C' | 'P', number>;
  bedLoop: boolean; bedFade: number;   // repetir a faixa | segundos de cruzamento
  sampAudio: boolean; sampVol: number; sampBlend: string; sampFade: number; sampZoom: number;

  // pool de samples (índice do player que cada slot ocupa)
  pool: (number | null)[]; poolOf: Record<number, number>; poolNext: number;
  held: Record<number, boolean>;

  // tempo e modulação
  mods: Mod[]; bpmManual: number; audioOn: boolean; audioFonte: string;

  // cenas e gravação
  cenas: Cena[]; cenaFade: number;
  recAlvo: string; recAlvoCtrl: string; recModo: RecModo;
  recSom: boolean; recMp4: boolean; recMbps: number; recDir: string;

  // configurações
  engine: 'dom' | 'gl'; glfx: Record<Deck, GlFx>;
  monQuality: string; poolSize: number; libDir: string;

  // texto na projeção
  txt: string; txtOn: boolean; txtSize: number; txtCor: string;
  txtX: number; txtY: number; txtModo: 'fixo' | 'marquee' | 'pisca'; txtContorno: boolean;

  // ui
  searchOpen: boolean; mirror: boolean; outLive: boolean; palco: boolean;
  browserOpen: boolean;

  set: <K extends keyof Session>(k: K, v: Session[K]) => void;
  addTo: (lane: Lane, it: Item) => boolean;
  removeFrom: (lane: Lane, id: string) => void;
  save: () => void;
};

export const useSession = create<Session>((set, get) => ({
  results: [], sel: null,
  lib: { V: migraAcervo(), C: LS('vj.libC', [] as Item[]) },
  now: { A: null, B: null, C: null, P: null },
  slots: LS('vj.slots', Array(10).fill(null) as (Item | null)[]),

  mark: { A: {}, B: {}, P: {} },
  tloop: { A: false, B: false },
  armed: 'A',

  // começa no meio: com os dois decks no ar, a mesa nasce equilibrada
  xf: 50, op: { A: 100, B: 100 }, zoom: { A: 100, B: 100 },
  pos: { A: { ...POS0 }, B: { ...POS0 } }, curve: 'linear', blackout: false, pattern: null,
  blend: 'normal', smooth: 60, ar: localStorage.getItem('vj.ar') || '16/9',
  fx: { A: new Set(), B: new Set(), M: new Set() }, amt: { A: 1, B: 1, M: 1 },
  bus: 'M',
  loop: LS('vj.loop', true), cc: LS('vj.cc', false),

  amode: 'follow', vol: { A: 100, B: 100, C: 80, P: 0 },
  bedLoop: LS('vj.bedLoop', false), bedFade: LS('vj.bedFade', 3),
  sampAudio: false, sampVol: 70, sampBlend: 'screen', sampFade: 90, sampZoom: 100,

  pool: Array(8).fill(null), poolOf: {}, poolNext: 0, held: {},

  mods: LS('vj.mods', [] as Mod[]), bpmManual: 0, audioOn: false,
  audioFonte: localStorage.getItem('vj.audioFonte') || 'system',

  cenas: LS('vj.cenas', [] as Cena[]), cenaFade: LS('vj.cenaFade', 0),
  recAlvo: localStorage.getItem('vj.recAlvo') || '',
  recAlvoCtrl: localStorage.getItem('vj.recAlvoCtrl') || '',
  recModo: (localStorage.getItem('vj.recModo') as RecModo) || 'out',
  recSom: LS('vj.recSom', true), recMp4: LS('vj.recMp4', false), recMbps: LS('vj.recMbps', 12),
  recDir: localStorage.getItem('vj.recDir') || '',   // vazio = Vídeos/taller-vj

  engine: LS<'dom' | 'gl'>('vj.engine', 'dom'),
  glfx: LS('vj.glfx', { A: { ...GLFX0 }, B: { ...GLFX0 } }),
  monQuality: localStorage.getItem('vj.monq') || 'small',
  poolSize: LS('vj.poolSize', 4),
  libDir: localStorage.getItem('vj.libDir') || '',   // vazio = Vídeos/taller-vj/library

  txt: localStorage.getItem('vj.txt') || '', txtOn: false,
  txtSize: LS('vj.txtSize', 8), txtCor: localStorage.getItem('vj.txtCor') || '#ffffff',
  txtX: LS('vj.txtX', 50), txtY: LS('vj.txtY', 86),
  txtModo: (localStorage.getItem('vj.txtModo') as 'fixo') || 'fixo',
  txtContorno: LS('vj.txtContorno', true),

  searchOpen: false, mirror: false, outLive: false,
  palco: LS('vj.palco', false),
  // busca e garimpo começam fechados: a tela nasce mostrando a mesa, não a pesquisa
  browserOpen: false,

  set: (k, v) => set({ [k]: v } as any),

  addTo: (lane, it) => {
    const lib = get().lib;
    if (lib[lane].some(x => x.id === it.id)) return false;
    const next = { ...lib, [lane]: [...lib[lane], clean(it)] };
    set({ lib: next });
    get().save();
    return true;
  },
  removeFrom: (lane, id) => {
    const lib = get().lib;
    set({ lib: { ...lib, [lane]: lib[lane].filter(x => x.id !== id) } });
    get().save();
  },
  save: () => {
    const s = get();
    (['V', 'C'] as Lane[]).forEach(l => localStorage.setItem('vj.lib' + l, JSON.stringify(s.lib[l])));
    localStorage.setItem('vj.slots', JSON.stringify(s.slots));
    localStorage.setItem('vj.ar', s.ar);
    localStorage.setItem('vj.loop', JSON.stringify(s.loop));
    localStorage.setItem('vj.cc', JSON.stringify(s.cc));
    localStorage.setItem('vj.mods', JSON.stringify(s.mods));
    localStorage.setItem('vj.audioFonte', s.audioFonte);
    localStorage.setItem('vj.engine', JSON.stringify(s.engine));
    localStorage.setItem('vj.glfx', JSON.stringify(s.glfx));
    localStorage.setItem('vj.monq', s.monQuality);
    localStorage.setItem('vj.poolSize', JSON.stringify(s.poolSize));
    localStorage.setItem('vj.libDir', s.libDir);
    localStorage.setItem('vj.cenas', JSON.stringify(s.cenas));
    localStorage.setItem('vj.cenaFade', JSON.stringify(s.cenaFade));
    localStorage.setItem('vj.recAlvo', s.recAlvo);
    localStorage.setItem('vj.recSom', JSON.stringify(s.recSom));
    localStorage.setItem('vj.recMp4', JSON.stringify(s.recMp4));
    localStorage.setItem('vj.recMbps', JSON.stringify(s.recMbps));
    localStorage.setItem('vj.recDir', s.recDir);
    localStorage.setItem('vj.recAlvoCtrl', s.recAlvoCtrl);
    localStorage.setItem('vj.recModo', s.recModo);
    localStorage.setItem('vj.palco', JSON.stringify(s.palco));
    localStorage.setItem('vj.bedLoop', JSON.stringify(s.bedLoop));
    localStorage.setItem('vj.bedFade', JSON.stringify(s.bedFade));
    localStorage.setItem('vj.txt', s.txt);
    localStorage.setItem('vj.txtSize', JSON.stringify(s.txtSize));
    localStorage.setItem('vj.txtCor', s.txtCor);
    localStorage.setItem('vj.txtX', JSON.stringify(s.txtX));
    localStorage.setItem('vj.txtY', JSON.stringify(s.txtY));
    localStorage.setItem('vj.txtModo', s.txtModo);
    localStorage.setItem('vj.txtContorno', JSON.stringify(s.txtContorno));

  }
}));
