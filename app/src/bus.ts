// ────────────────────────────────────────────
// TALLER VJ APP 0.2 — bus.ts
// § - Command transport between controller and output windows · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────

export type Deck = 'A' | 'B';
export type FxBus = 'A' | 'B' | 'M';

// ── § 1 — COMMANDS — controller → output ──
export type Cmd =
  | { c: 'load'; deck: Deck; id: string; kind?: 'yt' | 'file'; src?: string }
  | { c: 'loadList'; deck: Deck; list: string }
  | { c: 'play' | 'pause' | 'toggle'; deck: Deck }
  | { c: 'seek'; deck: Deck; t: number }
  | { c: 'vol'; deck: Deck; v: number }
  | { c: 'opacity'; deck: Deck; v: number }
  | { c: 'present'; deck: Deck; v: boolean }
  | { c: 'zoomCh'; deck: Deck; z: number }
  | { c: 'xf'; v: number }
  | { c: 'smooth'; ms: number }
  | { c: 'blend'; mode: string }
  | { c: 'bus'; bus: FxBus; fx: string[]; amt: number }
  | { c: 'frame'; ar: string }
  | { c: 'pos'; deck: Deck; pan: [number, number]; rot: number; flipH: boolean; flipV: boolean;
      crop: [number, number, number, number] }   // top right bottom left, em %
  | { c: 'blackout'; on: boolean }
  | { c: 'pattern'; name: string | null }
  | { c: 'engine'; mode: 'dom' | 'gl' }                       // motor escolhido pelo operador
  | { c: 'glfx'; deck: Deck; fx: Record<string, number> }     // shaders, só onde há pixels
  | { c: 'loop'; on: boolean }
  | { c: 'cc'; on: boolean }
  | { c: 'sampLoad'; i: number; id: string; tin: number; kind?: 'yt' | 'file'; src?: string }
  | { c: 'sampOn'; i: number }
  | { c: 'sampOff'; i: number; tin: number }
  | { c: 'sampSeek'; i: number; t: number }
  | { c: 'sampBlend'; mode: string }
  | { c: 'sampFade'; ms: number }
  | { c: 'sampVol'; v: number }
  | { c: 'sampZoom'; z: number }
  | { c: 'hello' };            // output acabou de subir e pede o estado inteiro

// ── § 2 — TELEMETRY — output → controller ──
// O controlador não consegue mais ler o player da outra janela de forma síncrona
// (são contextos separados). Em vez de request/response, a saída publica seu estado
// e o controlador mantém um espelho local — mais simples e sem risco de deadlock.
export type DeckTele = { time: number; state: number; dur: number };
export type Tele = {
  t: 'tele';
  ready: boolean;
  decks: Record<Deck, DeckTele>;
  samp: number[];              // tempo corrente de cada player do pool
};

// ── § 2.1 — SLOTS WINDOW — controle remoto, não uma segunda cópia do estado ──
// A janela dos slots não guarda nada: ela pinta o que o controlador publica e
// devolve apertos de tecla. O dono do estado continua sendo um só.
export type SlotInfo = {
  n: number; titulo: string; thumb: string;
  armado: boolean;      // carregado no pool da saída, pronto para disparar
  aceso: boolean;       // no ar neste instante
  trecho: string;       // "0:12–0:20" ou vazio
};
export type SlotsTele = { t: 'slots'; itens: SlotInfo[]; live: boolean };

export type Msg = Cmd | Tele | SlotsTele
  | { t: 'up' }                                   // saída anunciando que nasceu
  | { t: 'slotKey'; n: number; down: boolean }     // janela de slots -> controlador
  | { t: 'slotAsk' };                              // janela de slots pedindo estado

// ── § 3 — CHANNEL ──
const CH = 'vj';

export function makeBus() {
  const ch = new BroadcastChannel(CH);
  return {
    send(m: Msg) { ch.postMessage(m); },
    on(fn: (m: Msg) => void) {
      const h = (e: MessageEvent) => fn(e.data as Msg);
      ch.addEventListener('message', h);
      return () => ch.removeEventListener('message', h);
    },
    close() { ch.close(); }
  };
}
export type Bus = ReturnType<typeof makeBus>;
