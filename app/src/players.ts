// ────────────────────────────────────────────
// TALLER VJ APP 1.3 — players.ts
// § - Local players and one transport for every source · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import type { Deck, Kind } from './types';

/**
 * Canal é qualquer lugar do CONTROLADOR que toca vídeo: os dois monitores, o cue
 * e o bed. Todos têm o mesmo par de nós — um iframe e um <video> — e o mesmo
 * transporte, então nenhum deles precisa saber de onde o vídeo veio.
 */
export type Canal = Deck | 'P' | 'C';

export const L: {
  monA: YT.Player | null; monB: YT.Player | null;
  cue: YT.Player | null; bed: YT.Player | null;
  vidA: HTMLVideoElement | null; vidB: HTMLVideoElement | null;
  vidP: HTMLVideoElement | null; vidC: HTMLVideoElement | null;
  kind: Record<Canal, Kind>;
} = {
  monA: null, monB: null, cue: null, bed: null,
  vidA: null, vidB: null, vidP: null, vidC: null,
  kind: { A: 'yt', B: 'yt', P: 'yt', C: 'yt' }
};

export const pl = (c: Canal): YT.Player | null =>
  c === 'A' ? L.monA : c === 'B' ? L.monB : c === 'P' ? L.cue : L.bed;
export const vid = (c: Canal): HTMLVideoElement | null =>
  c === 'A' ? L.vidA : c === 'B' ? L.vidB : c === 'P' ? L.vidP : L.vidC;
export const setVid = (c: Canal, v: HTMLVideoElement | null) => {
  if (c === 'A') L.vidA = v; else if (c === 'B') L.vidB = v;
  else if (c === 'P') L.vidP = v; else L.vidC = v;
};

export const mon = (d: Deck) => pl(d);
const isFile = (c: Canal) => L.kind[c] === 'file';

/** Transporte do controlador, indiferente à fonte — mesma forma do da saída. */
export const M = {
  setKind(c: Canal, k: Kind) {
    L.kind[c] = k;
    const v = vid(c);
    if (v) v.style.display = k === 'file' ? '' : 'none';
    const wrap = document.getElementById('ytwrap' + c);
    if (wrap) wrap.style.display = k === 'yt' ? '' : 'none';
    if (k === 'file') { try { pl(c)?.pauseVideo(); } catch { /* ignore */ } }
    else { try { v?.pause(); } catch { /* ignore */ } }
  },
  loadFile(c: Canal, url: string, mudo = true) {
    M.setKind(c, 'file');
    const v = vid(c); if (!v) return;
    v.src = url; v.muted = mudo; v.play().catch(() => { });
  },
  loadYt(c: Canal, id: string) { M.setKind(c, 'yt'); pl(c)?.loadVideoById(id); },
  loadList(c: Canal, list: string) {
    M.setKind(c, 'yt');
    pl(c)?.loadPlaylist({ list, listType: 'playlist' });
  },
  play(c: Canal) { isFile(c) ? vid(c)?.play().catch(() => { }) : pl(c)?.playVideo(); },
  pause(c: Canal) { isFile(c) ? vid(c)?.pause() : pl(c)?.pauseVideo(); },
  toggle(c: Canal) {
    if (isFile(c)) { const v = vid(c); if (!v) return; v.paused ? v.play().catch(() => { }) : v.pause(); return; }
    const p = pl(c); if (!p) return;
    try { p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo(); } catch { /* ignore */ }
  },
  seek(c: Canal, t: number) {
    if (isFile(c)) { const v = vid(c); if (v) v.currentTime = t; return; }
    try { pl(c)?.seekTo(t, true); } catch { /* ignore */ }
  },
  time(c: Canal) {
    try { return isFile(c) ? (vid(c)?.currentTime ?? 0) : (pl(c)?.getCurrentTime() ?? 0); }
    catch { return 0; }
  },
  dur(c: Canal) {
    try { return isFile(c) ? (vid(c)?.duration || 0) : (pl(c)?.getDuration() ?? 0); }
    catch { return 0; }
  },
  state(c: Canal) {
    try {
      if (!isFile(c)) return pl(c)?.getPlayerState() ?? -1;
      const v = vid(c); if (!v) return -1;
      return v.ended ? 0 : v.paused ? 2 : 1;      // espelha os códigos da IFrame API
    } catch { return -1; }
  },
  vol(c: Canal, v: number) {
    if (isFile(c)) {
      const e = vid(c); if (!e) return;
      e.muted = v <= 0; e.volume = Math.max(0, Math.min(1, v / 100));
      return;
    }
    const p = pl(c); if (!p) return;
    try { if (v > 0) { p.unMute(); p.setVolume(Math.round(v)); } else p.mute(); } catch { /* ignore */ }
  },
  mute(c: Canal) {
    if (isFile(c)) { const e = vid(c); if (e) e.muted = true; return; }
    try { pl(c)?.mute(); } catch { /* ignore */ }
  }
};
