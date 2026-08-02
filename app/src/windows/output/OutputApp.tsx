// ────────────────────────────────────────────
// TALLER VJ APP 0.2 — OutputApp.tsx
// § - Output window: owns the program players, obeys the command bus · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { makeBus, type Cmd, type Deck, type FxBus, type Msg } from '../../bus';
import { usePlayer, ccOff, errText } from '../../hooks/usePlayer';
import './output.css';

const NSAMP = 4;
const SRC = 16 / 9;

export default function OutputApp() {
  // Os players nascem uma vez e são comandados por método. Nada aqui depende de
  // estado do React: toda mudança visual é escrita direto no style dos nós.
  // setLoop só repete playlist; vídeo avulso precisa ser rebobinado na mão no ENDED
  const onEnd = useRef<(d: Deck, state: number) => void>(() => { });
  const err = (d: Deck) => (code: number) => {
    (window as any).__lastError = { deck: d, code, text: errText(code) };
    console.warn('[vj] deck', d, errText(code));
  };
  const pA = usePlayer('ytAout', { onState: s => onEnd.current('A', s), onError: err('A') });
  const pB = usePlayer('ytBout', { onState: s => onEnd.current('B', s), onError: err('B') });
  const s0 = usePlayer('ytS0', { muted: true, quality: 'small' });
  const s1 = usePlayer('ytS1', { muted: true, quality: 'small' });
  const s2 = usePlayer('ytS2', { muted: true, quality: 'small' });
  const s3 = usePlayer('ytS3', { muted: true, quality: 'small' });

  const st = useRef({ xf: 0, opA: 1, opB: 1, hasA: false, hasB: false, svol: 0, loop: true, cc: false });
  const hint = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const samp = [s0, s1, s2, s3];
    const deck = (d: Deck) => (d === 'A' ? pA : pB).current;
    const el = (id: string) => document.getElementById(id)!;
    const root = document.documentElement.style;

    // a saída é o monitor conjunto: o crossfader só arbitra com os dois presentes
    const paint = () => {
      const { hasA, hasB, opA, opB, xf } = st.current;
      let oa = 0, ob = 0;
      if (hasA && hasB) { oa = opA; ob = opB * xf / 100; }
      else if (hasA) oa = opA;
      else if (hasB) ob = opB;
      el('pgA').style.opacity = oa.toFixed(3);
      el('pgB').style.opacity = ob.toFixed(3);
    };

    const applyBus = (b: FxBus, fx: string[], k: number) => {
      const set = new Set(fx), f: string[] = [];
      if (set.has('invert')) f.push(`invert(${k})`);
      if (set.has('melt')) f.push(`blur(${(k * 7).toFixed(1)}px) contrast(${(1 + k * 2.4).toFixed(2)}) saturate(${(1 + k).toFixed(2)})`);
      el('base' + b).style.filter = f.join(' ');
      el('hue' + b).style.animation = set.has('hue') ? `hueroll ${(6.5 - k * 5.5).toFixed(2)}s linear infinite` : '';
      const anim = el('anim' + b), a: string[] = [];
      if (set.has('glitch')) { anim.style.setProperty('--g', String(k)); a.push('glitch .18s steps(2) infinite'); }
      if (set.has('strobe')) { anim.style.setProperty('--s', (1 - k * .95).toFixed(3)); a.push('strobe .11s steps(1) infinite'); }
      anim.style.animation = a.join(', ');
    };

    const applyFrame = (ar: string) => {
      const [w, h] = ar.split('/').map(Number), T = w / h;
      root.setProperty('--ar', ar);
      if (T < SRC) { root.setProperty('--covh', '100%'); root.setProperty('--covw', (SRC / T * 100).toFixed(2) + '%'); }
      else { root.setProperty('--covw', '100%'); root.setProperty('--covh', (T / SRC * 100).toFixed(2) + '%'); }
    };

    const run = (m: Cmd) => {
      const p = 'deck' in m ? deck(m.deck) : null;
      switch (m.c) {
        case 'load': p?.loadVideoById(m.id); break;
        case 'loadList': p?.loadPlaylist({ list: m.list, listType: 'playlist' }); break;
        case 'play': p?.playVideo(); break;
        case 'pause': p?.pauseVideo(); break;
        case 'toggle': p && (p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()); break;
        case 'seek': p?.seekTo(m.t, true); break;
        case 'vol': p?.setVolume(Math.round(m.v)); break;
        case 'opacity': st.current[m.deck === 'A' ? 'opA' : 'opB'] = m.v; paint(); break;
        case 'present': st.current[m.deck === 'A' ? 'hasA' : 'hasB'] = m.v; paint(); break;
        case 'zoomCh': el('pg' + m.deck).style.setProperty('--zoom', String(m.z)); break;
        case 'xf': st.current.xf = m.v; paint(); break;
        case 'smooth': el('pgB').style.transition = `opacity ${m.ms}ms linear`; break;
        case 'blend': el('pgB').style.mixBlendMode = m.mode; break;
        case 'bus': applyBus(m.bus, m.fx, m.amt); break;
        case 'frame': applyFrame(m.ar); break;
        case 'loop': st.current.loop = m.on; (['A', 'B'] as Deck[]).forEach(d => deck(d)?.setLoop(m.on)); break;
        case 'cc':
          st.current.cc = m.on;
          (['A', 'B'] as Deck[]).forEach(d => {
            const q = deck(d); if (!q) return;
            if (m.on) ['captions', 'cc'].forEach(mod => (q as any).loadModule(mod)); else ccOff(q);
          });
          break;
        case 'sampLoad': {
          const q = samp[m.i]?.current; if (!q) break;
          q.loadVideoById({ videoId: m.id, startSeconds: m.tin });
          q.mute();
          // loadVideoById dispara play: deixamos parado no ponto de entrada
          setTimeout(() => { try { q.seekTo(m.tin, true); q.pauseVideo(); } catch { /* ignore */ } }, 1100);
          break;
        }
        case 'sampOn': {
          const q = samp[m.i]?.current; if (!q) break;
          if (st.current.svol > 0) { q.unMute(); q.setVolume(st.current.svol); } else q.mute();
          q.playVideo(); el('s' + m.i).style.opacity = '1';
          break;
        }
        case 'sampOff': {
          const q = samp[m.i]?.current; if (!q) break;
          el('s' + m.i).style.opacity = '0';
          q.mute(); q.pauseVideo(); q.seekTo(m.tin, true);
          break;
        }
        case 'sampSeek': samp[m.i]?.current?.seekTo(m.t, true); break;
        case 'sampBlend': el('pgS').style.mixBlendMode = m.mode; break;
        case 'sampFade':
          root.setProperty('--sfade', m.ms + 'ms');
          // fade 0 remove a transição: transição congela em janela oculta e o
          // disparo momentâneo não pode depender disso
          for (let i = 0; i < NSAMP; i++) el('s' + i).style.transition = m.ms > 0 ? '' : 'none';
          break;
        case 'sampVol':
          st.current.svol = m.v;
          samp.forEach(r => { const q = r.current; if (!q) return; if (m.v > 0) { q.unMute(); q.setVolume(m.v); } else q.mute(); });
          break;
        case 'sampZoom': el('pgS').style.setProperty('--zoom', String(m.z)); break;
        case 'hello': break;
      }
    };

    onEnd.current = (d, state) => {
      if (state !== 0 || !st.current.loop) return;   // 0 = ENDED
      const p = deck(d);
      try { p?.seekTo(0, true); p?.playVideo(); } catch { /* ignore */ }
    };

    const bus = makeBus();
    const off = bus.on((m: Msg) => { if ('c' in m) run(m); });
    bus.send({ t: 'up' });            // avisa o controlador que a saída nasceu

    const tele = setInterval(() => {
      const grab = (d: Deck) => {
        const q = deck(d);
        try { return { time: q?.getCurrentTime() ?? 0, state: q?.getPlayerState() ?? -1, dur: q?.getDuration() ?? 0 }; }
        catch { return { time: 0, state: -1, dur: 0 }; }
      };
      bus.send({
        t: 'tele', ready: !!pA.current,
        decks: { A: grab('A'), B: grab('B') },
        samp: samp.map(r => { try { return r.current?.getCurrentTime() ?? 0; } catch { return 0; } })
      });
    }, 200);

    const t = setTimeout(() => hint.current?.classList.add('gone'), 6000);
    applyFrame('16/9'); paint();

    // superfície imperativa só para o selftest do main process
    (window as any).VJ = {
      get ready() { return !!pA.current; },
      load: (d: Deck, id: string) => deck(d)?.loadVideoById(id),
      state: (d: Deck) => { try { return deck(d)?.getPlayerState() ?? -1; } catch { return -1; } },
      time: (d: Deck) => { try { return deck(d)?.getCurrentTime() ?? 0; } catch { return 0; } },
      seek: (d: Deck, t: number) => { try { deck(d)?.seekTo(t, true); } catch { /* ignore */ } },
      data: (d: Deck) => { try { return deck(d)?.getVideoData(); } catch { return null; } },
      xf: (v: number) => { st.current.xf = v; st.current.hasA = true; st.current.hasB = true; paint(); },
      opacity: (d: Deck, v: number) => run({ c: 'opacity', deck: d, v }),
      present: (d: Deck, v: boolean) => run({ c: 'present', deck: d, v })
    };

    return () => { off(); bus.close(); clearInterval(tele); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stage">
      <div className="frame">
        <div className="bus" id="hueM"><div className="bus" id="baseM"><div className="bus" id="animM">
          <div className="layer" id="pgA">
            <div className="bus" id="hueA"><div className="bus" id="baseA"><div className="bus" id="animA">
              <div id="ytAout" />
            </div></div></div>
          </div>
          <div className="layer" id="pgB">
            <div className="bus" id="hueB"><div className="bus" id="baseB"><div className="bus" id="animB">
              <div id="ytBout" />
            </div></div></div>
          </div>
          <div className="layer" id="pgS">
            <div className="samp" id="s0"><div id="ytS0" /></div>
            <div className="samp" id="s1"><div id="ytS1" /></div>
            <div className="samp" id="s2"><div id="ytS2" /></div>
            <div className="samp" id="s3"><div id="ytS3" /></div>
          </div>
        </div></div></div>
      </div>
      <div className="hint" ref={hint}>SAÍDA — o controle fica na outra janela</div>
    </div>
  );
}
