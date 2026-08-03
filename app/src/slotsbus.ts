// ────────────────────────────────────────────
// TALLER VJ APP 1.4 — slotsbus.ts
// § - Publishes slot state and takes key presses from the slots window · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { onBus, outLive, send } from './out';
import { holdOff, holdOn } from './actions';
import { fmt } from './types';
import type { SlotInfo } from './bus';

/**
 * A janela de slots é um CONTROLE REMOTO: não tem store, não decide nada. O
 * controlador continua sendo o único dono do estado — publica um retrato e
 * executa os apertos que chegam. Sem isso, dois donos brigariam pelo mesmo pool.
 */
const retrato = (): SlotInfo[] => {
  const s = useSession.getState();
  return s.slots.map((it, n) => ({
    n,
    titulo: it?.title ?? '',
    thumb: it?.thumb ?? '',
    armado: !!it && s.poolOf[n] != null,
    aceso: !!s.held[n],
    trecho: it?.out != null ? `${fmt(it.in ?? 0)}–${fmt(it.out)}` : ''
  }));
};

let ultimo = '';
let parar: (() => void)[] = [];

export function startSlotsBus() {
  stopSlotsBus();
  const publica = (forcar = false) => {
    const itens = retrato();
    const chave = JSON.stringify(itens) + outLive();
    if (!forcar && chave === ultimo) return;
    ultimo = chave;
    send({ t: 'slots', itens, live: outLive() } as never);
  };

  parar.push(onBus(m => {
    if (!('t' in m)) return;
    if (m.t === 'slotAsk') publica(true);
    // o disparo continua acontecendo AQUI, com as mesmas regras do teclado local
    if (m.t === 'slotKey') (m as { n: number; down: boolean }).down
      ? holdOn((m as { n: number }).n)
      : holdOff((m as { n: number }).n);
  }));

  parar.push(useSession.subscribe(() => publica()));
  const id = setInterval(() => publica(), 1000);   // 'live' muda sem tocar no store
  parar.push(() => clearInterval(id));
  publica(true);
}

export function stopSlotsBus() {
  parar.forEach(f => f());
  parar = [];
  ultimo = '';
}
