// ────────────────────────────────────────────
// TALLER VJ APP 0.3 — Cue.tsx
// § - Preview that never reaches the output · TSX
// Taller Dev 2026
// VAI CORINTHIANS!
// ────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useSession } from '../../../store';
import { usePlayer } from '../../../hooks/usePlayer';
import { L } from '../../../players';
import { clearMark, cue, sendCue, setMark } from '../../../actions';
import { fmt, type Item } from '../../../types';

export default function Cue() {
  const s = useSession();
  const [over, setOver] = useState(false);
  const p = usePlayer('ytPrev', { controls: true });

  useEffect(() => {
    const t = setInterval(() => { if (p.current) { L.cue = p.current; clearInterval(t); } }, 200);
    return () => clearInterval(t);
  }, []);

  const mk = s.mark.P;
  const has = mk.in != null || mk.out != null;
  const addTo = (lane: 'A' | 'B' | 'C') => { if (s.now.P) s.addTo(lane, s.now.P); };

  return (
    <>
      <div className="hd">
        <span>Cue <b>não vai ao ar</b></span>
        <span className="now">{s.now.P?.title ?? ''}</span>
      </div>

      <div id="cue" className={over ? 'over' : ''}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={e => {
          e.preventDefault(); e.stopPropagation(); setOver(false);
          try { cue(JSON.parse(e.dataTransfer.getData('text/plain')) as Item); } catch { /* ignore */ }
        }}>
        <div id="ytPrev" />
      </div>

      <div className="card">
        <div className="row">
          <button className="mk" onClick={() => setMark('P', 'in')}>IN</button>
          <button className="mk" onClick={() => setMark('P', 'out')}>OUT</button>
          <button className="mk" onClick={() => clearMark('P')}>×</button>
          <span className={'rng' + (has ? ' set' : '')}>{has ? `${fmt(mk.in)} → ${fmt(mk.out)}` : '—'}</span>
          <span className="grabh" draggable
            onDragStart={e => {
              if (!s.now.P) { e.preventDefault(); return; }
              e.dataTransfer.setData('text/plain',
                JSON.stringify({ ...s.now.P, in: mk.in ?? null, out: mk.out ?? null }));
              e.dataTransfer.effectAllowed = 'copy';
            }}>⇢ trecho</span>
          <span className="tag">fone</span>
          <input type="range" min={0} max={100} value={s.vol.P} style={{ maxWidth: 56 }}
            onChange={e => {
              const v = +e.target.value;
              s.set('vol', { ...s.vol, P: v });
              try { L.cue?.setVolume(v); } catch { /* ignore */ }
            }} />
        </div>
        <div className="row">
          <button onClick={() => sendCue('A')}>◄ A [</button>
          <button onClick={() => sendCue('B')}>B ► ]</button>
          <button onClick={() => addTo('A')}>+lista A</button>
          <button onClick={() => addTo('B')}>+lista B</button>
          <button onClick={() => addTo('C')}>+ bed C</button>
          <button className={'tgl' + (s.mirror ? ' on' : '')}
            onClick={() => s.set('mirror', !s.mirror)}>espelhar saída</button>
        </div>
      </div>
    </>
  );
}
