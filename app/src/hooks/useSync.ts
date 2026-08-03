// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — useSync.ts
// § - Monitor sync, trim loop and cue mirror, driven by telemetry · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { useSession } from '../store';
import { out, outLive, tele } from '../out';
import { M } from '../players';
import { kindOf, srcUrl, type Deck } from '../types';

const TICK = 400;

export function useSync() {
  const seen = useRef<Record<Deck, { t: number; ts: number }>>({ A: { t: 0, ts: 0 }, B: { t: 0, ts: 0 } });
  const mirrorId = useRef<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const s = useSession.getState();
      const live = outLive();
      if (s.outLive !== live) s.set('outLive', live);

      // espelho do cue: segue o deck que domina a saída
      if (s.mirror) {
        const a = !!s.now.A, b = !!s.now.B;
        const d: Deck | null = a && b ? (s.xf < 50 ? 'A' : 'B') : (a ? 'A' : (b ? 'B' : null));
        if (d && s.now[d]) {
          const it = s.now[d]!;
          if (mirrorId.current !== it.id) {
            mirrorId.current = it.id;
            // o espelho copia a fonte, seja ela qual for
            if (kindOf(it) === 'file' && it.src) M.loadFile('P', srcUrl(it.src), false);
            else M.loadYt('P', it.id);
            M.vol('P', s.vol.P);
          } else if (live) {
            const t = tele.decks[d].time;
            if (Math.abs(M.time('P') - t) > 0.8) M.seek('P', t);
            if (tele.decks[d].state === 1 && M.state('P') !== 1) M.play('P');
          }
        }
      } else mirrorId.current = null;

      // sem saída: o monitor é a fonte, só o trecho precisa ser vigiado
      if (!live) {
        (['A', 'B'] as Deck[]).forEach(d => {
          const mk = s.mark[d];
          if (!s.tloop[d] || mk.out == null) return;
          if (M.state(d) === 1 && M.time(d) >= mk.out - 0.1) M.seek(d, mk.in ?? 0);
        });
        return;
      }

      const now = performance.now();
      (['A', 'B'] as Deck[]).forEach(d => {
        try {
          const st = tele.decks[d].state, o = tele.decks[d].time, cur = M.time(d);
          const prev = seen.current[d], dt = (now - prev.ts) / 1000;
          const esperado = prev.ts ? prev.t + (M.state(d) === 1 ? dt : 0) : cur;
          // um salto grande é scrub do operador no monitor: aí a saída é que segue
          if (prev.ts && Math.abs(cur - esperado) > 1.0) {
            out.seek(d, cur);
            if (st === 1) out.play(d);
          } else {
            if (st === 1 && M.state(d) !== 1) M.play(d);
            if (st !== 1 && M.state(d) === 1) M.pause(d);
            if (st === 1 && Math.abs(cur - o) > 0.4) M.seek(d, o);
          }
          seen.current[d] = { t: M.time(d), ts: now };

          const mk = s.mark[d];
          if (s.tloop[d] && mk.out != null && st === 1 && o >= mk.out - 0.1) {
            out.seek(d, mk.in ?? 0); M.seek(d, mk.in ?? 0);
            seen.current[d] = { t: mk.in ?? 0, ts: now };
          }
        } catch { /* ignore */ }
      });

      // samples com trecho também voltam ao IN
      s.pool.forEach((n, i) => {
        if (n == null || !s.held[n]) return;
        const it = s.slots[n];
        if (!it || it.out == null) return;
        if (tele.samp[i] >= it.out - 0.1) out.sampSeek(i, it.in ?? 0);
      });
    }, TICK);
    return () => clearInterval(id);
  }, []);
}
