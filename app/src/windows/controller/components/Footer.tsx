// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Footer.tsx
// § - Audio bus, bed deck and global toggles · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../../store';
import { usePlayer } from '../../../hooks/usePlayer';
import { L } from '../../../players';
import { applyAudio, dropInto, nextBed, panic, toggle } from '../../../actions';
import Library from './Library';

const MODES = [
  ['follow', 'follow video'], ['lockA', 'lock A'], ['lockB', 'lock B'],
  ['both', 'A+B abertos'], ['bed', 'só bed']
];

export default function Footer() {
  const s = useSession();
  const [over, setOver] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const p = usePlayer('ytCout', { quality: 'small', onState: st => { if (st === 0) nextBed(); } });

  useEffect(() => {
    const t = setInterval(() => { if (p.current) { L.bed = p.current; applyAudio(); clearInterval(t); } }, 200);
    return () => clearInterval(t);
  }, []);

  const rect = btn.current?.getBoundingClientRect();

  return (
    <div id="foot">
      <span className="tag">áudio</span>
      <select value={s.amode} onChange={e => { s.set('amode', e.target.value); applyAudio(); }}>
        {MODES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
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
        <input type="range" min={0} max={100} value={s.vol.C} style={{ width: 64 }}
          onChange={e => { s.set('vol', { ...s.vol, C: +e.target.value }); applyAudio(); }} />
        <button ref={btn} onClick={() => setListOpen(o => !o)}>lista ▾</button>
      </div>

      <div style={{ flex: 1 }} />
      <button onClick={panic}>panic (P)</button>
      <span className="tag">fx: {s.bus === 'M' ? 'master' : 'deck ' + s.bus}</span>

      {listOpen && (
        // ancorada no botão, não no canto da tela
        <div id="bedlist" style={{
          left: Math.max(6, Math.min(rect?.left ?? 6, Math.max(6, innerWidth - 286))),
          bottom: Math.max(6, innerHeight - (rect?.top ?? innerHeight) + 6)
        }}>
          <Library lane="C" className="lib" />
        </div>
      )}
    </div>
  );
}
