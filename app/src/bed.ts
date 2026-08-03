// ────────────────────────────────────────────
// TALLER VJ APP 1.6 — bed.ts
// § - Bed playlist: repeat one, or cross into the next track · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { M } from './players';
import { play } from './actions';

/**
 * Corte seco entre faixas é o que denuncia amadorismo numa festa. Um cruzamento
 * de verdade exigiria dois players; com um só, o que dá para fazer bem é baixar
 * o volume ANTES do fim e subir depois da troca — o ouvido lê como transição,
 * não como emenda. O tempo é o mesmo dos dois lados, então soa simétrico.
 */
let vigia = 0;
let cruzando = false;

const vol = (v: number) => {
  const s = useSession.getState();
  M.vol('C', Math.max(0, Math.min(100, v)));
  return s;
};

/** Rampa de volume em N ms, sem tocar no valor guardado do operador. */
function rampa(de: number, para: number, ms: number): Promise<void> {
  return new Promise(res => {
    const t0 = performance.now();
    const passo = () => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      vol(de + (para - de) * p);
      if (p < 1) requestAnimationFrame(passo); else res();
    };
    passo();
  });
}

export async function proximaFaixa(forcado = false) {
  const s = useSession.getState();
  const l = s.lib.C;
  if (!l.length || cruzando) return;
  cruzando = true;
  const seg = Math.max(0, s.bedFade);
  const alvo = s.vol.C;

  try {
    // repetir a mesma faixa é o caso mais simples: volta ao começo e segue
    if (s.bedLoop && s.now.C && !forcado) {
      M.seek('C', 0); M.play('C');
      return;
    }
    const i = s.now.C ? l.findIndex(x => x.id === s.now.C!.id) : -1;
    const prox = l[(i + 1) % l.length];
    if (!prox) return;
    if (seg > 0) await rampa(alvo, 0, seg * 500);   // metade descendo
    await play('C', prox);
    if (seg > 0) await rampa(0, alvo, seg * 500);   // metade subindo
    else vol(alvo);
  } finally {
    cruzando = false;
  }
}

/** Vigia o fim da faixa para começar a descer ANTES do silêncio. */
export function startBed() {
  stopBed();
  vigia = window.setInterval(() => {
    const s = useSession.getState();
    if (cruzando || !s.now.C || M.state('C') !== 1) return;
    const seg = Math.max(0, s.bedFade);
    if (!seg) return;                       // sem cruzamento, o ENDED resolve
    const dur = M.dur('C'), t = M.time('C');
    if (dur > seg + 1 && dur - t <= seg / 2) proximaFaixa();
  }, 250);
}

export function stopBed() { clearInterval(vigia); cruzando = false; }
