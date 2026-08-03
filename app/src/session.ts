// ────────────────────────────────────────────
// TALLER VJ APP 0.6 — session.ts
// § - Session serialisation: export, import, autosave · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useSession } from './store';
import { flashMsg } from './actions';
import type { Curve, Item, Pos } from './types';
import type { Cena } from './scenes';
import type { Mod } from './modulation';

export const SESSION_VERSION = 1;

export type SessionFile = {
  app: 'taller-vj';
  version: number;
  meta: { criadaEm: string; nome?: string; notas?: string };
  lib: { V?: Item[]; A?: Item[]; B?: Item[]; C: Item[] };
  slots: (Item | null)[];
  mixer: {
    xf: number; op: Record<string, number>; zoom: Record<string, number>;
    pos: Record<string, Pos>; curve: Curve; blend: string; smooth: number; ar: string;
    fx: Record<string, string[]>; amt: Record<string, number>;
    sampBlend: string; sampFade: number; sampZoom: number; sampVol: number; sampAudio: boolean;
  };
  audio: { amode: string; vol: Record<string, number> };
  cenas?: Cena[];
  mods?: Mod[];
  // a chave de API NUNCA entra no arquivo: sessão é feita para ser compartilhada
};

export function snapshot(nome?: string): SessionFile {
  const s = useSession.getState();
  return {
    app: 'taller-vj', version: SESSION_VERSION,
    meta: { criadaEm: new Date().toISOString(), nome },
    lib: { V: s.lib.V, C: s.lib.C },
    slots: s.slots,
    mixer: {
      xf: s.xf, op: s.op, zoom: s.zoom, pos: s.pos, curve: s.curve,
      blend: s.blend, smooth: s.smooth, ar: s.ar,
      fx: { A: [...s.fx.A], B: [...s.fx.B], M: [...s.fx.M] }, amt: s.amt,
      sampBlend: s.sampBlend, sampFade: s.sampFade, sampZoom: s.sampZoom,
      sampVol: s.sampVol, sampAudio: s.sampAudio
    },
    audio: { amode: s.amode, vol: s.vol },
    // cenas e rotas são o trabalho da noite: viajam junto com a sessão
    cenas: s.cenas, mods: s.mods
  };
}

export function restore(f: SessionFile) {
  if (f?.app !== 'taller-vj') { flashMsg('not a Taller VJ session'); return false; }
  const s = useSession.getState();
  // arquivo antigo trazia A e B separados: junta sem repetir
  const vistos = new Set<string>();
  const vid = [...(f.lib?.V ?? []), ...(f.lib?.A ?? []), ...(f.lib?.B ?? [])]
    .filter(i => !vistos.has(i.id) && vistos.add(i.id));
  s.set('lib', { V: vid, C: f.lib?.C ?? [] });
  s.set('slots', f.slots ?? Array(10).fill(null));
  const m = f.mixer;
  if (m) {
    s.set('xf', m.xf ?? 0);
    s.set('op', m.op as any); s.set('zoom', m.zoom as any); s.set('pos', m.pos as any);
    s.set('curve', m.curve ?? 'linear'); s.set('blend', m.blend ?? 'normal');
    s.set('smooth', m.smooth ?? 60); s.set('ar', m.ar ?? '16/9');
    s.set('fx', { A: new Set(m.fx?.A ?? []), B: new Set(m.fx?.B ?? []), M: new Set(m.fx?.M ?? []) } as any);
    s.set('amt', m.amt as any);
    s.set('sampBlend', m.sampBlend ?? 'screen'); s.set('sampFade', m.sampFade ?? 90);
    s.set('sampZoom', m.sampZoom ?? 100); s.set('sampVol', m.sampVol ?? 70);
    s.set('sampAudio', !!m.sampAudio);
  }
  if (f.audio) { s.set('amode', f.audio.amode ?? 'follow'); s.set('vol', f.audio.vol as any); }
  if (Array.isArray(f.cenas)) s.set('cenas', f.cenas);
  if (Array.isArray(f.mods)) s.set('mods', f.mods);
  // pool é volátil: os samples serão recarregados sob demanda
  s.set('pool', Array(8).fill(null)); s.set('poolOf', {}); s.set('held', {});
  s.save();
  return true;
}

export async function exportSession() {
  const p = await window.vj?.saveSession?.(snapshot());
  flashMsg(p ? 'session saved' : 'cancelled');
}

export async function importSession(after?: () => void) {
  const r = await window.vj?.openSession?.();
  if (!r) return;
  if ((r as any).error) { flashMsg('invalid file'); return; }
  if (restore((r as any).data)) { flashMsg('session loaded'); after?.(); }
}
