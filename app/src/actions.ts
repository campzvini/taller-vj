// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — actions.ts
// § - Everything the UI can do: transport, cue, slots, mixer · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { out, outLive, tele } from './out';
import { L, mon } from './players';
import type { Deck, FxName, Item, Lane, MarkOwner } from './types';
import { clean } from './types';

const S = () => useSession.getState();
export let flashMsg: (s: string) => void = () => { };
export const setFlash = (fn: (s: string) => void) => { flashMsg = fn; };

/* ── § 1 — Transport ─────────────────────────────────────────────
   Sem a janela de saída aberta o monitor local vira a fonte, com áudio.
   Com ela aberta, o monitor volta a ser espelho mudo.                        */
export function play(lane: Lane, it: Item | null, at = 0) {
  if (!it) return;
  const s = S();
  if (lane === 'C') {
    if (it.plist) L.bed?.loadPlaylist({ list: it.plist, listType: 'playlist' });
    else L.bed?.loadVideoById(it.id);
    s.set('now', { ...s.now, C: it });
    applyAudio();
    return;
  }
  const d = lane as Deck;
  if (outLive()) {
    if (it.plist) out.loadList(d, it.plist); else out.load(d, it.id);
    out.present(d, true);
    if (at > 1) setTimeout(() => out.seek(d, at), 900);
  }
  const m = mon(d);
  if (m) {
    if (it.plist && !outLive()) m.loadPlaylist({ list: it.plist, listType: 'playlist' });
    else m.loadVideoById(it.id);
    if (at > 1) setTimeout(() => { try { m.seekTo(at, true); } catch { /* ignore */ } }, 900);
  }
  s.set('now', { ...s.now, [d]: it } as any);
  applyAudio();
}

export function toggle(lane: Lane) {
  if (lane === 'C') {
    try { L.bed!.getPlayerState() === 1 ? L.bed!.pauseVideo() : L.bed!.playVideo(); } catch { /* ignore */ }
    return;
  }
  const d = lane as Deck;
  if (outLive()) { out.toggle(d); return; }
  const m = mon(d); if (!m) return;
  try { m.getPlayerState() === 1 ? m.pauseVideo() : m.playVideo(); } catch { /* ignore */ }
}

export function nextBed() {
  const s = S(), l = s.lib.C;
  if (!l.length) return;
  const i = s.now.C ? l.findIndex(x => x.id === s.now.C!.id) : -1;
  play('C', l[(i + 1) % l.length]);
}

/* ── § 2 — Cue ── */
export function cue(it: Item | null) {
  if (!it) return;
  const s = S();
  if (s.mirror) s.set('mirror', false);      // carregar manualmente desliga o espelho
  const c = clean(it);
  s.set('now', { ...s.now, P: c });
  s.set('mark', { ...s.mark, P: { in: c.in ?? null, out: c.out ?? null } });
  L.cue?.loadVideoById(c.id);
  try { L.cue?.setVolume(s.vol.P); } catch { /* ignore */ }
}

export function sendCue(d: Deck) {
  const s = S();
  const it = s.now.P;
  if (!it) { flashMsg('nada no cue'); return; }
  let t = 0;
  try { t = L.cue?.getCurrentTime() ?? 0; } catch { /* ignore */ }
  const m = s.mark.P;
  if (m.in != null || m.out != null) {
    s.set('mark', { ...s.mark, [d]: { in: m.in, out: m.out } } as any);
    s.set('tloop', { ...s.tloop, [d]: m.out != null } as any);
    t = m.in ?? t;
  }
  play(d, it, t);
}

/* ── § 3 — Marks ── */
export function headAt(o: MarkOwner): number {
  if (o === 'P') { try { return L.cue?.getCurrentTime() ?? 0; } catch { return 0; } }
  if (outLive()) return tele.decks[o].time;
  try { return mon(o)?.getCurrentTime() ?? 0; } catch { return 0; }
}
export const setMark = (o: MarkOwner, which: 'in' | 'out') => {
  const s = S();
  s.set('mark', { ...s.mark, [o]: { ...s.mark[o], [which]: headAt(o) } } as any);
};
export const clearMark = (o: MarkOwner) => {
  const s = S();
  s.set('mark', { ...s.mark, [o]: {} } as any);
  if (o !== 'P') s.set('tloop', { ...s.tloop, [o]: false } as any);
};
export const toggleTloop = (d: Deck) => {
  const s = S();
  if (s.mark[d].out == null) { flashMsg('marque OUT antes'); return; }
  s.set('tloop', { ...s.tloop, [d]: !s.tloop[d] } as any);
};

/* ── § 4 — Slots and sample pool ── */
export function poolAssign(n: number) {
  const s = S(), it = s.slots[n];
  if (!it || !outLive()) return;
  if (s.poolOf[n] != null) { out.sampLoad(s.poolOf[n], it.id, it.in ?? 0); return; }
  const i = s.poolNext % s.pool.length;
  const old = s.pool[i];
  const poolOf = { ...s.poolOf };
  if (old != null) delete poolOf[old];
  poolOf[n] = i;
  const pool = [...s.pool]; pool[i] = n;
  s.set('pool', pool); s.set('poolOf', poolOf); s.set('poolNext', s.poolNext + 1);
  out.sampLoad(i, it.id, it.in ?? 0);
}
export function assignSlot(n: number) {
  const s = S();
  const base = s.now.P ?? (s.sel != null ? s.results[s.sel] : null);
  if (!base) return;
  const m = s.now.P ? s.mark.P : {};
  const slots = [...s.slots];
  slots[n] = { ...clean(base), in: m.in ?? null, out: m.out ?? null };
  s.set('slots', slots); s.save();
  poolAssign(n);
  flashMsg('slot ' + n);
}
export function holdOn(n: number) {
  const s = S();
  if (!outLive() || !s.slots[n] || s.held[n]) return;
  const i = s.poolOf[n];
  if (i == null) { poolAssign(n); flashMsg('slot ' + n + ' carregando — aperte de novo'); return; }
  s.set('held', { ...s.held, [n]: true });
  out.sampOn(i);
}
export function holdOff(n: number) {
  const s = S();
  if (!s.held[n]) return;
  s.set('held', { ...s.held, [n]: false });
  const i = s.poolOf[n];
  if (i != null) out.sampOff(i, s.slots[n]?.in ?? 0);
}

/* ── § 5 — Mixer ── */
export function applyXf(v: number) { S().set('xf', v); out.xf(v); applyAudio(); }
export function applyOpacity(d: Deck, v: number) {
  const s = S(); s.set('op', { ...s.op, [d]: v } as any); out.opacity(d, v / 100);
}
export function applyZoom(d: Deck, v: number) {
  const s = S(); s.set('zoom', { ...s.zoom, [d]: v } as any);
  out.zoomCh(d, +(v / 100).toFixed(3));
}
export function toggleFx(b: 'A' | 'B' | 'M', name: FxName) {
  const s = S();
  const next = new Set(s.fx[b]);
  next.has(name) ? next.delete(name) : next.add(name);
  s.set('fx', { ...s.fx, [b]: next } as any);
  out.fxBus(b, [...next], s.amt[b]);
}
export function setAmt(b: 'A' | 'B' | 'M', v: number) {
  const s = S();
  s.set('amt', { ...s.amt, [b]: v } as any);
  out.fxBus(b, [...s.fx[b]], v);
}
// vive aqui, e não no componente, para a tecla G também alcançar
let fading: number | null = null;
export function autofade(seconds = 4) {
  if (fading) { cancelAnimationFrame(fading); fading = null; return; }
  const dur = Math.max(.2, seconds) * 1000;
  const from = S().xf, to = from > 50 ? 0 : 100, t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    applyXf(Math.round(from + (to - from) * e));
    fading = p < 1 ? requestAnimationFrame(step) : null;
  };
  fading = requestAnimationFrame(step);
}

export function panic() {
  const s = S();
  s.set('fx', { A: new Set(), B: new Set(), M: new Set() });
  (['A', 'B', 'M'] as const).forEach(b => out.fxBus(b, [], s.amt[b]));
  flashMsg('fx zerados');
}

/* ── § 6 — Audio ── */
export function applyAudio() {
  const s = S();
  const t = s.xf / 100;
  let a = s.vol.A, b = s.vol.B;
  if (s.amode === 'follow') { a *= (1 - t); b *= t; }
  else if (s.amode === 'lockA') b = 0;
  else if (s.amode === 'lockB') a = 0;
  else if (s.amode === 'bed') { a = 0; b = 0; }

  if (outLive()) {
    out.vol('A', a); out.vol('B', b);
    [L.monA, L.monB].forEach(p => { try { p?.mute(); } catch { /* ignore */ } });
  } else {
    ([['A', a], ['B', b]] as [Deck, number][]).forEach(([d, val]) => {
      const p = mon(d); if (!p) return;
      try { if (val > 0) { p.unMute(); p.setVolume(Math.round(val)); } else p.mute(); } catch { /* ignore */ }
    });
  }
  try { L.bed?.setVolume(Math.round(s.vol.C)); } catch { /* ignore */ }
}

/* ── § 7 — Drag payloads ── */
export function dropInto(lane: Lane, e: React.DragEvent) {
  let it: Item;
  try { it = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
  const from = it._from;
  if (from === lane) return;
  const ok = S().addTo(lane, it);
  if (ok) flashMsg('→ ' + lane);
  if (from && 'ABC'.includes(from) && !e.ctrlKey) S().removeFrom(from as Lane, it.id);
}
