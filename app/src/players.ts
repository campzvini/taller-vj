// ────────────────────────────────────────────
// TALLER VJ APP 0.6 — players.ts
// § - Local players and their transport, source-agnostic · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import type { Deck, Kind } from './types';

// Monitores, cue e bed vivem no controlador. Ficam num registro simples porque as
// ações precisam alcançá-los de fora da árvore React.
export const L: {
  monA: YT.Player | null; monB: YT.Player | null;
  cue: YT.Player | null; bed: YT.Player | null;
  vidA: HTMLVideoElement | null; vidB: HTMLVideoElement | null;
  kind: Record<Deck, Kind>;
} = { monA: null, monB: null, cue: null, bed: null, vidA: null, vidB: null, kind: { A: 'yt', B: 'yt' } };

export const mon = (d: Deck) => (d === 'A' ? L.monA : L.monB);
export const vid = (d: Deck) => (d === 'A' ? L.vidA : L.vidB);
const isFile = (d: Deck) => L.kind[d] === 'file';

/** Transporte do monitor, indiferente à fonte — mesma forma do transporte da saída. */
export const M = {
  setKind(d: Deck, k: Kind) {
    L.kind[d] = k;
    const v = vid(d);
    if (v) v.style.display = k === 'file' ? '' : 'none';
    const wrap = document.getElementById('ytwrap' + d);
    if (wrap) wrap.style.display = k === 'yt' ? '' : 'none';
    if (k === 'file') { try { mon(d)?.pauseVideo(); } catch { /* ignore */ } }
    else { try { v?.pause(); } catch { /* ignore */ } }
  },
  loadFile(d: Deck, url: string) {
    M.setKind(d, 'file');
    const v = vid(d); if (!v) return;
    v.src = url; v.muted = true; v.play().catch(() => { });
  },
  loadYt(d: Deck, id: string) { M.setKind(d, 'yt'); mon(d)?.loadVideoById(id); },
  play(d: Deck) { isFile(d) ? vid(d)?.play().catch(() => { }) : mon(d)?.playVideo(); },
  pause(d: Deck) { isFile(d) ? vid(d)?.pause() : mon(d)?.pauseVideo(); },
  toggle(d: Deck) {
    if (isFile(d)) { const v = vid(d); if (!v) return; v.paused ? v.play().catch(() => { }) : v.pause(); return; }
    const p = mon(d); if (!p) return;
    try { p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo(); } catch { /* ignore */ }
  },
  seek(d: Deck, t: number) {
    if (isFile(d)) { const v = vid(d); if (v) v.currentTime = t; return; }
    try { mon(d)?.seekTo(t, true); } catch { /* ignore */ }
  },
  time(d: Deck) {
    try { return isFile(d) ? (vid(d)?.currentTime ?? 0) : (mon(d)?.getCurrentTime() ?? 0); }
    catch { return 0; }
  },
  state(d: Deck) {
    try {
      if (!isFile(d)) return mon(d)?.getPlayerState() ?? -1;
      const v = vid(d); if (!v) return -1;
      return v.ended ? 0 : v.paused ? 2 : 1;
    } catch { return -1; }
  },
  vol(d: Deck, v: number) {
    if (isFile(d)) {
      const e = vid(d); if (!e) return;
      e.muted = v <= 0; e.volume = Math.max(0, Math.min(1, v / 100));
      return;
    }
    const p = mon(d); if (!p) return;
    try { if (v > 0) { p.unMute(); p.setVolume(Math.round(v)); } else p.mute(); } catch { /* ignore */ }
  },
  mute(d: Deck) {
    if (isFile(d)) { const e = vid(d); if (e) e.muted = true; return; }
    try { mon(d)?.mute(); } catch { /* ignore */ }
  }
};
