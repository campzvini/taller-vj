// ────────────────────────────────────────────
// TALLER VJ APP 1.5 — Footer.tsx
// § - Audio plane: routing, deck levels and the bed player · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { usePlayer } from '../../../hooks/usePlayer';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { L, M, setVid } from '../../../players';
import { applyAudio, dropInto, nextBed, toggle } from '../../../actions';
import { fmt } from '../../../types';
import Library from './Library';

const MODES = [
  ['follow', 'follow video'], ['lockA', 'lock A'], ['lockB', 'lock B'],
  ['both', 'A+B open'], ['bed', 'bed only']
];

/**
 * A imagem mora nas colunas, o som mora aqui. Tudo que decide áudio numa linha
 * só — roteamento, níveis dos decks e o bed, que é um player como os outros e
 * por isso ganha miniatura, transporte e linha de tempo.
 */
export default function Footer() {
  const s = useSession();
  const [over, setOver] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const p = usePlayer('ytCout', { quality: 'small', onState: st => { if (st === 0) nextBed(); } });
  // o <video> do bed também precisa avisar que acabou

  const closeList = useCallback(() => setListOpen(false), []);
  useClickOutside(listOpen, closeList, [list, btn]);

  useEffect(() => {
    const t0 = setInterval(() => { if (p.current) { L.bed = p.current; applyAudio(); clearInterval(t0); } }, 200);
    const v = () => document.getElementById('vidCout') as HTMLVideoElement | null;
    const fim = () => nextBed();
    v()?.addEventListener('ended', fim);
    return () => { clearInterval(t0); v()?.removeEventListener('ended', fim); };
  }, []);

  useEffect(() => {
    const i = setInterval(() => {
      if (arrastando) return;
      setT(M.time('C')); setDur(M.dur('C'));
    }, 400);
    return () => clearInterval(i);
  }, [arrastando]);

  const rect = btn.current?.getBoundingClientRect();
  const nivel = (d: 'A' | 'B') => (
    <>
      <span className="tag">{d}</span>
      <input type="range" min={0} max={100} value={s.vol[d]} style={{ width: 64 }}
        onChange={e => { s.set('vol', { ...s.vol, [d]: +e.target.value } as never); applyAudio(); }} />
    </>
  );

  return (
    <div id="foot">
      <span className="tag">audio</span>
      <select value={s.amode} style={{ width: 108 }}
        onChange={e => { s.set('amode', e.target.value); applyAudio(); }}>
        {MODES.map(([v, t2]) => <option key={v} value={v}>{t2}</option>)}
      </select>
      {nivel('A')}
      {nivel('B')}

      <div className="fsep" />

      <div id="colC" className={over ? 'drop' : ''}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); dropInto('C', e); }}>
        <span className="tag">bed C</span>
        {/* o bed é ÁUDIO: mostramos a capa do item, não o pôster do player */}
        <div id="bedmon">
          <div className="srcwrap" id="ytwrapC"><div id="ytCout" /></div>
          <video className="srcvid" id="vidCout" playsInline
            style={{ display: 'none' }} ref={el => setVid('C', el)} />
          {s.now.C?.thumb
            ? <img className="bedthumb" src={s.now.C.thumb} alt="" />
            : <div className="bedthumb vazio">♪</div>}
        </div>

        <button className="tplay" onClick={() => toggle('C')}
          title="play / pause the bed (V)">{M.state('C') === 1 ? '❚❚' : '▶'}</button>

        <input type="range" id="bedtime" min={0} max={Math.max(1, Math.floor(dur))}
          value={Math.min(Math.floor(t), Math.max(1, Math.floor(dur)))}
          title="position" style={{ flex: 1, minWidth: 120 }}
          onMouseDown={() => setArrastando(true)}
          onChange={e => setT(+e.target.value)}
          onMouseUp={e => {
            const v = +(e.target as HTMLInputElement).value;
            setArrastando(false);
            M.seek('C', v);
          }} />
        <span className="ttime">{fmt(t)}{dur ? ' / ' + fmt(dur) : ''}</span>

        <span className="now bedtitle">{s.now.C?.title ?? 'nothing loaded'}</span>

        <span className="tag">vol</span>
        <input type="range" min={0} max={100} value={s.vol.C} style={{ width: 72 }}
          onChange={e => { s.set('vol', { ...s.vol, C: +e.target.value }); applyAudio(); }} />
        <button className={'mk' + (s.bedLoop ? ' on' : '')}
          title={s.bedLoop ? 'repeating this track' : 'playlist: goes to the next track'}
          onClick={() => { s.set('bedLoop', !s.bedLoop); s.save(); }}>⟲</button>
        <span className="tag">xfade</span>
        <input type="range" min={0} max={10} value={s.bedFade} style={{ flex: '0 0 60px' }}
          title="seconds of cross between tracks"
          onChange={e => { s.set('bedFade', +e.target.value); s.save(); }} />
        <span className="val">{s.bedFade ? s.bedFade + 's' : 'cut'}</span>
        <button ref={btn} className="mk" onClick={() => setListOpen(o => !o)}>
          list ({s.lib.C.length})</button>
      </div>

      {listOpen && (
        <div id="bedlist" ref={list} style={{
          left: Math.max(6, Math.min(rect?.left ?? 6, Math.max(6, innerWidth - 326))),
          bottom: Math.max(6, innerHeight - (rect?.top ?? innerHeight) + 8)
        }}>
          <div className="bhd"><span>bed playlist</span></div>
          <Library lane="C" className="lib" />
        </div>
      )}
    </div>
  );
}
