// ────────────────────────────────────────────
// TALLER VJ APP 0.2 — OutputApp.tsx
// § - Output window: owns the program players, obeys the command bus · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { makeBus, type Cmd, type Deck, type FxBus, type Msg } from '../../bus';
import { usePlayer, ccOff, errText } from '../../hooks/usePlayer';
import { GlLayer } from '../../gl/renderer';
import './output.css';

const NSAMP = 8;   // teto; o controlador usa os N primeiros conforme a configuração
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
  const s4 = usePlayer('ytS4', { muted: true, quality: 'small' });
  const s5 = usePlayer('ytS5', { muted: true, quality: 'small' });
  const s6 = usePlayer('ytS6', { muted: true, quality: 'small' });
  const s7 = usePlayer('ytS7', { muted: true, quality: 'small' });

  const st = useRef({ xf: 50, opA: 1, opB: 1, hasA: false, hasB: false, svol: 0, loop: true, cc: false });
  const hint = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const samp = [s0, s1, s2, s3, s4, s5, s6, s7];
    const yt = (d: Deck) => (d === 'A' ? pA : pB).current;
    const el = (id: string) => document.getElementById(id)!;
    const vid = (d: Deck) => el('vid' + d + 'out') as HTMLVideoElement;
    const root = document.documentElement.style;

    // Cada deck aceita duas fontes; a ativa manda no transporte. YouTube segue
    // sendo o padrão — arquivo é opção, e as duas convivem sem se atrapalhar.
    const kind: Record<Deck, 'yt' | 'file'> = { A: 'yt', B: 'yt' };
    const isFile = (d: Deck) => kind[d] === 'file';

    // Motor híbrido: o shader só alcança fontes com pixels. Com o YouTube no deck,
    // aquela camada continua em DOM/CSS — não é escolha, é limite do iframe.
    let engine: 'dom' | 'gl' = 'dom';
    const gl: Partial<Record<Deck, GlLayer>> = {};
    const glAtivo = (d: Deck) => engine === 'gl' && isFile(d) && !!gl[d]?.ok;

    const montaGl = (d: Deck) => {
      if (gl[d]) return gl[d]!;
      try {
        const c = el('gl' + d) as HTMLCanvasElement;
        const layer = new GlLayer(c);
        layer.attach(vid(d));
        layer.start();
        gl[d] = layer;
        return layer;
      } catch { return null; }
    };
    const pintaEngine = (d: Deck) => {
      const usaGl = glAtivo(d);
      el('gl' + d).style.display = usaGl ? '' : 'none';
      vid(d).style.display = isFile(d) && !usaGl ? '' : 'none';
      el('ytwrap' + d).style.display = kind[d] === 'yt' ? '' : 'none';
    };

    const setKind = (d: Deck, k: 'yt' | 'file') => {
      kind[d] = k;
      if (k === 'file' && engine === 'gl') montaGl(d);
      pintaEngine(d);
      if (k === 'file') { try { yt(d)?.pauseVideo(); } catch { /* ignore */ } }
      else { try { vid(d).pause(); } catch { /* ignore */ } }
    };
    const T = {
      play: (d: Deck) => isFile(d) ? void vid(d).play().catch(() => { }) : yt(d)?.playVideo(),
      pause: (d: Deck) => isFile(d) ? vid(d).pause() : yt(d)?.pauseVideo(),
      toggle: (d: Deck) => {
        if (isFile(d)) { const v = vid(d); v.paused ? v.play().catch(() => { }) : v.pause(); return; }
        const p = yt(d); if (p) p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo();
      },
      seek: (d: Deck, t: number) => isFile(d) ? (vid(d).currentTime = t) : yt(d)?.seekTo(t, true),
      vol: (d: Deck, v: number) => isFile(d) ? (vid(d).volume = Math.max(0, Math.min(1, v / 100)))
                                            : yt(d)?.setVolume(Math.round(v)),
      time: (d: Deck) => { try { return isFile(d) ? vid(d).currentTime : (yt(d)?.getCurrentTime() ?? 0); } catch { return 0; } },
      dur: (d: Deck) => { try { return isFile(d) ? (vid(d).duration || 0) : (yt(d)?.getDuration() ?? 0); } catch { return 0; } },
      state: (d: Deck) => {
        try {
          if (!isFile(d)) return yt(d)?.getPlayerState() ?? -1;
          const v = vid(d);
          return v.ended ? 0 : v.paused ? 2 : 1;    // espelha os códigos da IFrame API
        } catch { return -1; }
      }
    };

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

    // O cover é recalculado a partir do tamanho REAL do quadro, então vale tanto para
    // a janela com proporção forçada quanto para tela cheia no projetor.
    const recover = () => {
      const f = document.querySelector('.frame') as HTMLElement | null;
      if (!f || !f.clientHeight) return;
      const T = f.clientWidth / f.clientHeight;
      if (T < SRC) { root.setProperty('--covh', '100%'); root.setProperty('--covw', (SRC / T * 100).toFixed(2) + '%'); }
      else { root.setProperty('--covw', '100%'); root.setProperty('--covh', (T / SRC * 100).toFixed(2) + '%'); }
    };
    const ro = new ResizeObserver(recover);
    const frameEl = document.querySelector('.frame');
    if (frameEl) ro.observe(frameEl);

    const applyFrame = (ar: string) => { window.vj?.setAspect?.(ar); recover(); };

    const run = (m: Cmd) => {
      switch (m.c) {
        case 'load':
          if (m.kind === 'file' && m.src) {
            setKind(m.deck, 'file');
            const v = vid(m.deck);
            v.src = m.src; v.loop = st.current.loop;
            v.play().catch(() => { });
          } else {
            setKind(m.deck, 'yt');
            yt(m.deck)?.loadVideoById(m.id);
          }
          break;
        case 'loadList': setKind(m.deck, 'yt'); yt(m.deck)?.loadPlaylist({ list: m.list, listType: 'playlist' }); break;
        case 'play': T.play(m.deck); break;
        case 'pause': T.pause(m.deck); break;
        case 'toggle': T.toggle(m.deck); break;
        case 'seek': T.seek(m.deck, m.t); break;
        case 'vol': T.vol(m.deck, m.v); break;
        case 'opacity': st.current[m.deck === 'A' ? 'opA' : 'opB'] = m.v; paint(); break;
        case 'present': st.current[m.deck === 'A' ? 'hasA' : 'hasB'] = m.v; paint(); break;
        case 'zoomCh': el('pg' + m.deck).style.setProperty('--zoom', String(m.z)); break;
        case 'xf': st.current.xf = m.v; paint(); break;
        case 'smooth': el('pgB').style.transition = `opacity ${m.ms}ms linear`; break;
        case 'blend': el('pgB').style.mixBlendMode = m.mode; break;
        case 'bus': applyBus(m.bus, m.fx, m.amt); break;
        case 'frame': applyFrame(m.ar); break;
        case 'pos': {
          const l = el('pg' + m.deck).style;
          l.setProperty('--panx', m.pan[0] + '%'); l.setProperty('--pany', m.pan[1] + '%');
          l.setProperty('--rot', m.rot + 'deg');
          l.setProperty('--fx', m.flipH ? '-1' : '1'); l.setProperty('--fy', m.flipV ? '-1' : '1');
          const [t, r, b, lf] = m.crop;
          l.setProperty('--ct', t + '%'); l.setProperty('--cr', r + '%');
          l.setProperty('--cb', b + '%'); l.setProperty('--cl', lf + '%');
          break;
        }
        case 'blackout': el('black').classList.toggle('on', m.on); break;
        case 'engine':
          engine = m.mode;
          (['A', 'B'] as Deck[]).forEach(d => {
            if (engine === 'gl' && isFile(d)) montaGl(d);
            else if (engine === 'dom') { gl[d]?.stop(); }
            if (engine === 'gl' && gl[d]) gl[d]!.start();
            pintaEngine(d);
          });
          break;
        case 'glfx': {
          const layer = gl[m.deck];
          if (layer) Object.assign(layer.fx, m.fx);
          break;
        }
        case 'pattern': {
          const p = el('pattern');
          p.classList.toggle('on', !!m.name);
          p.innerHTML = !m.name ? '' :
            m.name === 'grid' ? '<div class="pt-grid"></div><div class="pt-cross"></div><div class="pt-edge"></div>' :
            m.name === 'bars' ? '<div class="pt-bars">' +
              ['#fff','#ff0','#0ff','#0f0','#f0f','#f00','#00f','#000']
                .map(c => `<i style="background:${c}"></i>`).join('') + '</div>' :
            m.name === 'focus' ? '<div class="pt-focus"></div><div class="pt-cross"></div>' : '';
          break;
        }
        case 'loop':
          st.current.loop = m.on;
          (['A', 'B'] as Deck[]).forEach(d => { yt(d)?.setLoop(m.on); vid(d).loop = m.on; });
          break;
        case 'cc':
          st.current.cc = m.on;
          (['A', 'B'] as Deck[]).forEach(d => {
            const q = yt(d); if (!q) return;
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
      try { yt(d)?.seekTo(0, true); yt(d)?.playVideo(); } catch { /* ignore */ }
    };

    const bus = makeBus();
    const off = bus.on((m: Msg) => { if ('c' in m) run(m); });
    bus.send({ t: 'up' });            // avisa o controlador que a saída nasceu

    const tele = setInterval(() => {
      const grab = (d: Deck) => ({ time: T.time(d), state: T.state(d), dur: T.dur(d) });
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
      load: (d: Deck, id: string) => run({ c: 'load', deck: d, id }),
      loadFile: (d: Deck, src: string) => run({ c: 'load', deck: d, id: src, kind: 'file', src }),
      kind: (d: Deck) => kind[d],
      glInfo: (d: Deck) => gl[d] ? { frames: gl[d]!.frames, brilho: gl[d]!.brilho, ok: gl[d]!.ok } : null,
      state: (d: Deck) => T.state(d),
      time: (d: Deck) => T.time(d),
      seek: (d: Deck, t: number) => T.seek(d, t),
      data: (d: Deck) => { try { return yt(d)?.getVideoData(); } catch { return null; } },
      xf: (v: number) => { st.current.xf = v; st.current.hasA = true; st.current.hasB = true; paint(); },
      opacity: (d: Deck, v: number) => run({ c: 'opacity', deck: d, v }),
      present: (d: Deck, v: boolean) => run({ c: 'present', deck: d, v })
    };

    return () => { off(); bus.close(); clearInterval(tele); clearTimeout(t); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stage">
      <div className="frame">
        <div className="bus" id="hueM"><div className="bus" id="baseM"><div className="bus" id="animM">
          <div className="layer" id="pgA">
            <div className="bus" id="hueA"><div className="bus" id="baseA"><div className="bus" id="animA">
              <div className="srcwrap" id="ytwrapA"><div id="ytAout" /></div>
              <video className="srcvid" id="vidAout" playsInline style={{ display: 'none' }} />
              <canvas className="srcvid" id="glA" style={{ display: 'none' }} />
            </div></div></div>
          </div>
          <div className="layer" id="pgB">
            <div className="bus" id="hueB"><div className="bus" id="baseB"><div className="bus" id="animB">
              <div className="srcwrap" id="ytwrapB"><div id="ytBout" /></div>
              <video className="srcvid" id="vidBout" playsInline style={{ display: 'none' }} />
              <canvas className="srcvid" id="glB" style={{ display: 'none' }} />
            </div></div></div>
          </div>
          <div className="layer" id="pgS">
            {Array.from({ length: NSAMP }, (_, i) => (
              <div className="samp" id={'s' + i} key={i}><div id={'ytS' + i} /></div>
            ))}
          </div>
        </div></div></div>
        <div id="pattern" />
        <div id="black" />
      </div>
      <div className="hint" ref={hint}>SAÍDA — o controle fica na outra janela</div>
    </div>
  );
}
