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
  abrirSaida, applyXf, assignSlot, autofade, fecharSaida, flashMsg, holdOff, holdOn, panic,
  sendCue, telaCheiaSaida, toggle, toggleBlackout, toggleFx
} from '../actions';
import { capturar, chamar } from '../scenes';
import type { Deck, FxBus, FxName } from '../types';

const FXKEY: Record<string, FxName> = { q: 'glitch', w: 'invert', e: 'melt', r: 'hue', t: 'strobe' };
const BUSKEY: Record<string, FxBus> = { z: 'A', x: 'B', c: 'M' };

export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Só campo de TEXTO engole as teclas. Antes qualquer input engolia — e como
      // o foco fica no slider depois de um arraste, a mesa inteira parava de
      // responder às teclas sem nenhum sinal na tela.
      const alvo = e.target as HTMLElement;
      const tag = alvo?.tagName;
      const tipo = (alvo as HTMLInputElement)?.type;
      const texto = tag === 'TEXTAREA' || alvo?.isContentEditable ||
        (tag === 'INPUT' && ['text', 'password', 'search', 'email', 'url', 'number'].includes(tipo));
      if (texto) {
        if (e.key === 'Escape') alvo.blur();
        return;
      }
      // slider com foco moveria sozinho junto com o comando: solta o foco.
      // select continua navegável por teclado, que é comportamento legítimo.
      if (tag === 'INPUT' && tipo === 'range') alvo.blur();
      const s = useSession.getState();
      const k = e.key, kl = k.toLowerCase();

      if (/^[0-9]$/.test(k)) {
        e.preventDefault();
        if (e.repeat) return;
        e.shiftKey ? assignSlot(+k) : holdOn(+k);
        return;
      }
      if (k === 'F9') { e.preventDefault(); s.set('palco', !s.palco); s.save(); return; }
      // F1..F8 chamam cena; com Shift, regravam a cena por cima da mistura atual
      const f = /^F([1-8])$/.exec(k);
      if (f) {
        e.preventDefault();
        const i = +f[1] - 1;
        if (e.shiftKey) {
          const l = [...s.cenas];
          if (l[i]) { l[i] = { ...capturar(l[i].nome), id: l[i].id }; flashMsg('cena ' + (i + 1) + ' regravada'); }
          else { while (l.length < i) l.push(capturar('cena ' + (l.length + 1))); l[i] = capturar('cena ' + (i + 1)); flashMsg('cena ' + (i + 1) + ' guardada'); }
          s.set('cenas', l); s.save();
        } else if (!chamar(i)) flashMsg('cena ' + (i + 1) + ' vazia');
        return;
      }
      if (k === '/') { e.preventDefault(); s.set('searchOpen', !s.searchOpen); return; }
      // Ctrl+F: garimpo. '/' continua sendo a busca rápida da faixa de cima
      if (kl === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); s.set('browserOpen', !s.browserOpen); return;
      }
      if (k === '[') { sendCue('A'); return; }
      if (k === ']') { sendCue('B'); return; }
      if (k === 'Tab') { e.preventDefault(); s.set('armed', s.armed === 'A' ? 'B' : 'A'); return; }
      // espaço toca o deck armado; SHIFT+espaço toca o bed. Par que se aprende junto.
      if (k === ' ') { e.preventDefault(); toggle(e.shiftKey ? 'C' : s.armed); return; }
      if (k === 'ArrowRight' || k === 'ArrowLeft') {
        e.preventDefault();
        applyXf(Math.max(0, Math.min(100, s.xf + (k === 'ArrowRight' ? 6 : -6))));
        return;
      }
      if (k === 'Home') { e.preventDefault(); applyXf(0); return; }
      if (k === 'End') { e.preventDefault(); applyXf(100); return; }
      if (BUSKEY[kl]) { s.set('bus', BUSKEY[kl]); return; }
      if (FXKEY[kl]) { toggleFx(s.bus, FXKEY[kl]); return; }
      if (kl === 'o') { e.shiftKey ? fecharSaida() : abrirSaida(); return; }
      if (k === 'F11') { e.preventDefault(); telaCheiaSaida(); return; }
      if (kl === 'v') { toggle('C'); return; }
      if (kl === 'g') { autofade(); return; }
      if (kl === 'b') { toggleBlackout(); return; }
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
