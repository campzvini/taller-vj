// ────────────────────────────────────────────
// TALLER VJ APP 1.2 — Footer.tsx
// § - Audio routing, bed deck with timeline · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { usePlayer } from '../../../hooks/usePlayer';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { L } from '../../../players';
import { applyAudio, dropInto, nextBed, toggle } from '../../../actions';
import { fmt } from '../../../types';
import Library from './Library';

const MODES = [
  ['follow', 'follow video'], ['lockA', 'lock A'], ['lockB', 'lock B'],
  ['both', 'A+B open'], ['bed', 'bed only']
];

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

  const closeList = useCallback(() => setListOpen(false), []);
  useClickOutside(listOpen, closeList, [list, btn]);

  useEffect(() => {
    const t0 = setInterval(() => { if (p.current) { L.bed = p.current; applyAudio(); clearInterval(t0); } }, 200);
    return () => clearInterval(t0);
  }, []);

  // a linha de tempo do bed lê o player direto: ele mora nesta janela
  useEffect(() => {
    const i = setInterval(() => {
      if (!L.bed || arrastando) return;
      try {
        setT(L.bed.getCurrentTime() || 0);
        setDur(L.bed.getDuration() || 0);
      } catch { /* player trocando de vídeo */ }
    }, 400);
    return () => clearInterval(i);
  }, [arrastando]);

  const rect = btn.current?.getBoundingClientRect();

  return (
    <div id="foot">
      <span className="tag">audio</span>
      <select value={s.amode} onChange={e => { s.set('amode', e.target.value); applyAudio(); }}>
        {MODES.map(([v, t2]) => <option key={v} value={v}>{t2}</option>)}
      </select>

      <div className="fsep" />

      <div id="colC" className={over ? 'drop' : ''}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); dropInto('C', e); }}>
        <span className="tag">bed C</span>
        <div id="bedmon"><div id="ytCout" /></div>
        <span className="now bedtitle">{s.now.C?.title ?? ''}</span>
        <button onClick={() => toggle('C')}>▶❚❚ (V)</button>

        <input type="range" id="bedtime" min={0} max={Math.max(1, Math.floor(dur))} value={Math.floor(t)}
          title="position" style={{ width: 150 }}
          onMouseDown={() => setArrastando(true)}
          onChange={e => setT(+e.target.value)}
          onMouseUp={e => {
            const v = +(e.target as HTMLInputElement).value;
            setArrastando(false);
            try { L.bed?.seekTo(v, true); } catch { /* ignore */ }
          }} />
        <span className="val">{fmt(t)}{dur ? ' / ' + fmt(dur) : ''}</span>

        <span className="tag">vol</span>
        <input type="range" min={0} max={100} value={s.vol.C} style={{ width: 64 }}
          onChange={e => { s.set('vol', { ...s.vol, C: +e.target.value }); applyAudio(); }} />
        <button ref={btn} onClick={() => setListOpen(o => !o)}>list ▾</button>
      </div>

      <div style={{ flex: 1 }} />
      <span className="tag">fx: {s.bus === 'M' ? 'master' : 'deck ' + s.bus}</span>

      {listOpen && (
        // ancorada no botão, não no canto da tela
        <div id="bedlist" ref={list} style={{
          left: Math.max(6, Math.min(rect?.left ?? 6, Math.max(6, innerWidth - 286))),
          bottom: Math.max(6, innerHeight - (rect?.top ?? innerHeight) + 6)
        }}>
          <Library lane="C" className="lib" />
        </div>
      )}
    </div>
  );
}
