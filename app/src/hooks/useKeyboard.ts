// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — useKeyboard.ts
// § - Performance key bindings · TS
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect } from 'react';
import { useSession } from '../store';
import { out } from '../out';
import {
  applyXf, assignSlot, autofade, holdOff, holdOn, panic, sendCue, toggle, toggleFx
} from '../actions';
import type { Deck, FxBus, FxName } from '../types';

const FXKEY: Record<string, FxName> = { q: 'glitch', w: 'invert', e: 'melt', r: 'hue', t: 'strobe' };
const BUSKEY: Record<string, FxBus> = { z: 'A', x: 'B', c: 'M' };

export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      const s = useSession.getState();
      const k = e.key, kl = k.toLowerCase();

      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        if (e.repeat) return;
        e.shiftKey ? assignSlot(+k) : holdOn(+k);
        return;
      }
      if (k === '/') { e.preventDefault(); s.set('searchOpen', true); s.save(); return; }
      if (k === '[') { sendCue('A'); return; }
      if (k === ']') { sendCue('B'); return; }
      if (k === 'Tab') { e.preventDefault(); s.set('armed', s.armed === 'A' ? 'B' : 'A'); return; }
      if (k === ' ') { e.preventDefault(); toggle(s.armed); return; }
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        applyXf(Math.max(0, Math.min(100, s.xf + (k === 'ArrowRight' ? 6 : -6))));
        return;
      }
      if (k === 'Home') { applyXf(0); return; }
      if (k === 'End') { applyXf(100); return; }
      if (BUSKEY[kl]) { s.set('bus', BUSKEY[kl]); return; }
      if (FXKEY[kl]) { toggleFx(s.bus, FXKEY[kl]); return; }
      if (kl === 'o') { window.vj?.openOutput(); return; }
      if (kl === 'v') { toggle('C'); return; }
      if (kl === 'g') { autofade(); return; }
      if (kl === 'p') { panic(); return; }
      if (kl === 'l') {
        const on = !s.loop; s.set('loop', on); s.save(); out.loop(on); return;
      }
      if (kl === 'k') {
        const on = !s.cc; s.set('cc', on); s.save(); out.cc(on); return;
      }
    };
    const up = (e: KeyboardEvent) => { if (/^[0-9]$/.test(e.key)) holdOff(+e.key); };
    const blur = () => {
      const held = useSession.getState().held;
      Object.keys(held).forEach(n => { if (held[+n]) holdOff(+n); });
    };
    addEventListener('keydown', down);
    addEventListener('keyup', up);
    addEventListener('blur', blur);
    return () => {
      removeEventListener('keydown', down);
      removeEventListener('keyup', up);
      removeEventListener('blur', blur);
    };
  }, []);
}

export type { Deck };
