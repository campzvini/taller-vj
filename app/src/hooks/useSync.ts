// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — useSync.ts
// § - Monitor sync, trim loop and cue mirror, driven by telemetry · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { useSession } from '../store';
import { out, outLive, tele } from '../out';
import { L, mon } from '../players';
import type { Deck } from '../types';

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
            L.cue?.loadVideoById(it.id);
            try { L.cue?.setVolume(s.vol.P); } catch { /* ignore */ }
          } else if (live) {
            try {
              const t = tele.decks[d].time;
              if (Math.abs((L.cue?.getCurrentTime() ?? 0) - t) > 0.8) L.cue?.seekTo(t, true);
              if (tele.decks[d].state === 1 && L.cue?.getPlayerState() !== 1) L.cue?.playVideo();
            } catch { /* ignore */ }
          }
        }
      } else mirrorId.current = null;

      // sem saída: o monitor é a fonte, só o trecho precisa ser vigiado
      if (!live) {
        (['A', 'B'] as Deck[]).forEach(d => {
          const m = mon(d), mk = s.mark[d];
          if (!m || !s.tloop[d] || mk.out == null) return;
          try { if (m.getPlayerState() === 1 && m.getCurrentTime() >= mk.out - 0.1) m.seekTo(mk.in ?? 0, true); }
          catch { /* ignore */ }
        });
        return;
      }

      const now = performance.now();
      (['A', 'B'] as Deck[]).forEach(d => {
        const m = mon(d); if (!m) return;
        try {
          const st = tele.decks[d].state, o = tele.decks[d].time, cur = m.getCurrentTime();
          const prev = seen.current[d], dt = (now - prev.ts) / 1000;
          const esperado = prev.ts ? prev.t + (m.getPlayerState() === 1 ? dt : 0) : cur;
          // um salto grande é scrub do operador no monitor: aí a saída é que segue
          if (prev.ts && Math.abs(cur - esperado) > 1.0) {
            out.seek(d, cur);
            if (st === 1) out.play(d);
          } else {
            if (st === 1 && m.getPlayerState() !== 1) m.playVideo();
            if (st !== 1 && m.getPlayerState() === 1) m.pauseVideo();
            if (st === 1 && Math.abs(cur - o) > 0.4) m.seekTo(o, true);
          }
          seen.current[d] = { t: m.getCurrentTime(), ts: now };

          const mk = s.mark[d];
          if (s.tloop[d] && mk.out != null && st === 1 && o >= mk.out - 0.1) {
            out.seek(d, mk.in ?? 0); m.seekTo(mk.in ?? 0, true);
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
